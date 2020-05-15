import {
    TistoryApi,
    TistoryKey,
    TistoryAccountInfo,
    ListPostEachItem,
} from "tistory-js/v1";
import {
    CollectInput,
    PostLog,
    SaveInput,
    LoadInput,
    ClearInput,
} from "./tistory-collector-types";
import { parse, HTMLElement } from "node-html-parser";

//
// 서울 타임존을 사용한다.
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Seoul");

/**
 * 티스토리 날짜 수집기가 TistoryAPI를 사용할 수 있게 도와주는 설정값.
 */
export interface TistoryCollectorConfig {
    /**
     * 티스토리 API 키
     */
    key?: TistoryKey;

    /**
     * 티스토리 계정 정보
     */
    account?: TistoryAccountInfo;
}

/**
 * 티스토리 날짜 수집기
 */
export class TistoryCollector {
    /**
     * 로그 데이터가 저장된 div 요소의 id.
     */
    private readonly logDivId = "__LOG_DATA__";

    /**
     * 티스토리 API 객체.
     */
    private readonly api: TistoryApi;

    /**
     * 티스토리 계정 정보
     */
    private readonly account?: TistoryAccountInfo;

    constructor(config?: TistoryCollectorConfig) {
        this.api = new TistoryApi(config?.key);
        this.account = config?.account;
    }

    /**
     * N개월 전 날짜를 "YYYY-MM-DD" 형태로 가져온다.
     */
    private getNthMonthBefore(month: number): string {
        return moment().subtract(month, "month").format("YYYY-MM-DD");
    }

    /**
     * 게시글이 수집에 포함되어야 하는지 검사한다.
     */
    private isInclude(post: ListPostEachItem, includeMask: string): boolean {
        let idx = 0;

        //
        // 마스크의 길이가 올바른지 검사한다.
        if (includeMask.length !== 3) {
            throw new Error(
                `excludeMask의 길이가 3이 아닙니다 : ${includeMask}`
            );
        }

        //
        // 비공개
        if (post.visibility === "0") idx = 0;
        //
        // 보호됨
        if (post.visibility === "15") idx = 1;
        //
        // 발행됨
        if (post.visibility === "20") idx = 2;

        //
        // 마스크에서 1로 설정되어 있어야만,
        // 수집결과에 포함될 수 있다.
        return includeMask[idx] === "1";
    }

    /**
     * 포스팅 이력을 게시글에 저장합니다.
     */
    private async save(arg: SaveInput): Promise<void> {
        //
        // 이력을 문자열 형태로 직렬화한다.
        const serializedLog: string = Array.from(arg.postLog)
            .map((log) => {
                const date = log[0];
                const count = log[1];
                return `${date}:${count}`;
            })
            .sort()
            .join(" ");

        //
        // 액세스 토큰부터 취득한다.
        const code = await this.api.getCodeViaAccountInfo(this.account);
        const access_token = await this.api.getAccessTokenViaCode(code);

        //
        // 게시글에 포스팅 이력을 저장한다.
        await this.api.modifyPost({
            access_token,
            blogName: arg.storageBlogName,
            postId: arg.storagePostId,
            title: `post-metadata (updated at ${moment().format(
                "YYYY-MM-DD HH:mm:ss"
            )})`,
            content: `<div id="${this.logDivId}">${serializedLog}</div>`,
            visibility: 3,
        });
        console.log("데이터 저장 완료");
    }

    /**
     * 이력이 저장된 게시글에서 이력을 추출합니다.
     */
    private async load(arg: LoadInput): Promise<PostLog> {
        //
        // 액세스 토큰부터 취득한다.
        const code = await this.api.getCodeViaAccountInfo(this.account);
        const access_token = await this.api.getAccessTokenViaCode(code);

        //
        // 게시글을 읽어온다.
        const apiOut = await this.api.readPost({
            access_token,
            blogName: arg.storageBlogName,
            postId: arg.storagePostId,
        });

        //
        // 빈 게시글이면, 빈 이력을 반환한다.
        if (
            apiOut.item.content === "" ||
            apiOut.item.content === `<div id="${this.logDivId}"></div>`
        ) {
            return new Map();
        }

        //
        // 빈 게시글이 아니라면 그곳에서 이력 데이터를 찾는다.
        const nodeRoot = parse(apiOut.item.content);
        const dataElem: HTMLElement | null = (nodeRoot as any).querySelector(
            `#${this.logDivId}`
        );
        if (dataElem === null) {
            throw new Error(`해당 포스트에서 이력 데이터를 찾을 수 없습니다.`);
        }

        //
        // 1년이 지나버린 이력을 지우기 위해,
        // 1년전 날짜를 가져온다.
        const beforeOneYear = this.getNthMonthBefore(12);

        //
        // 문자열 형태로 직렬화된 이력
        const asText = dataElem.rawText;

        //
        // 맵 형태의 이력
        const postLog: PostLog = new Map();

        asText.split(" ").forEach((log) => {
            //
            // [date, count] 형태로 쪼갠다.
            const smallPart = log.split(":");

            //
            // 유효성 검사 (1)
            // 이력 토큰은 ":"으로 나누었을 때, 2개로 나누어져야 한다.
            if (smallPart.length !== 2) {
                throw new Error(
                    `이력 토큰이 아닌 데이터를 발견했습니다 : At ${JSON.stringify(
                        smallPart,
                        null,
                        4
                    )}`
                );
            }

            //
            // 유효성 검사 (2)
            // 이력 토큰의 첫 번째는 "YYYY-MM-DD" 형태여야 한다.
            if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(smallPart[0])) {
                throw new Error(
                    `날짜로 변환할 수 없습니다 : At ${smallPart[0]}`
                );
            }

            //
            // 유효성 검사 (3)
            // 이력 토큰의 두 번째는 0으로 시작하지 않는 숫자여야 한다.
            if (!/^[1-9][0-9]*$/.test(smallPart[1])) {
                throw new Error(
                    `숫자로 변환할 수 없습니다 : At ${smallPart[1]}`
                );
            }

            //
            // 해당 날짜의 카운트를 올린다.
            // 단, 현재 기준으로 1년이 넘어서 표시되지 않는 데이터는 무시한다.
            const date = String(smallPart[0]);
            const cnt = Number(smallPart[1]);
            if (beforeOneYear <= date) {
                postLog.set(date, cnt);
            }
        });
        console.log("데이터 로딩 완료");
        return postLog;
    }

    /**
     * 어떤 이력에서 최근 N개월이 제거된 이력을 반환한다.
     */
    private cutNthMonth(log: PostLog, month: number): PostLog {
        //
        // N개월 전의 날짜를 가져온다.
        const beforeNthMonth = this.getNthMonthBefore(month);

        //
        // 이력에 저장된 날짜들을 가져오고,
        // N개월 이전보다 크다면 이력에서 삭제한다.
        const dates = Array.from(log.keys());
        for (const date of dates) {
            if (beforeNthMonth <= date) {
                log.delete(date);
            }
        }

        //
        // 결과를 반환한다.
        return log;
    }

    /**
     * 타겟 스토리지의 내용을 제거한다.
     */
    public async clear(arg: ClearInput): Promise<void> {
        //
        // 액세스 토큰을 취득한다.
        const code = await this.api.getCodeViaAccountInfo(this.account);
        const access_token = await this.api.getAccessTokenViaCode(code);

        //
        // 정말 스토리지 게시글인지 체크한다.
        try {
            console.log("정말 스토리지 데이터인지 확인합니다.");
            await this.load(arg);
            console.log("데이터 검증 완료");
        } catch (e) {
            throw new Error(
                `스토리지 게시글이 아닌 것 같습니다. 수동으로 삭제해주세요. [${e.message}]`
            );
        }

        //
        // 내용을 빈 문자열로 덮어쓴다.
        await this.api.modifyPost({
            access_token,
            blogName: arg.storageBlogName,
            postId: arg.storagePostId,
            title: `게시글 이력 (Updated At ${moment().format(
                "YYYY-MM-DD HH:mm:ss"
            )})`,
            content: `<div id="${this.logDivId}"></div>`,
            visibility: 3,
        });
        console.log("데이터 초기화 완료");
    }

    /**
     * 어떤 블로그의 전체 포스팅 이력을 가져옵니다.
     * {k:날짜, v:개수}로 이루어진 Map을 반환합니다.
     */
    public async collect(arg: CollectInput): Promise<PostLog> {
        //
        // 인자 유효성 검사 : includeMask
        //
        // 기본 마스크 세팅
        //      비공개 : 제외 (좌측 비트)
        //      보호됨 : 제외 (중앙 비트)
        //      공개됨 : 포함 (우측 비트)
        const includeMask: string = process.env["includeMask"] || "001";
        if (!/^[01]{3}$/.test(includeMask)) {
            throw new Error(
                `includeMask는 0과 1로 이루어진 3글자 문자열이어야 합니다 : ${includeMask}`
            );
        }
        console.log("사용된 포함 마스크 : ", includeMask);

        //
        // 액세스 토큰을 취득한다.
        const code = await this.api.getCodeViaAccountInfo(this.account);
        const access_token = await this.api.getAccessTokenViaCode(code);

        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            스토리지 게시글에서 기존이력 정보에서 최근 N개월의 이력을 제거한다.
            다음 단계에서 N개월의 이력이 재수집될 것이다.

            첫 수집이라면 N=12가 되도록 강제해야 한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
        const rawPostLog: PostLog = await this.load({
            storageBlogName: arg.storageBlogName || arg.targetBlogName,
            storagePostId: arg.storagePostId,
        });
        const updateRange = rawPostLog.size
            ? Math.max(Math.min(arg.updateRange || 1, 12), 1)
            : 12;
        const postLog: PostLog = this.cutNthMonth(rawPostLog, updateRange);

        //
        // 업데이트 구간 관련 안내.
        console.log("요청된 업데이트 구간 : ", arg.updateRange || "없음");
        console.log("적용된 업데이트 구간 : ", updateRange);

        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            최근 페이지부터 시작해서 updateCriteriaDate보다 큰 이력들을 삽입한다. 
            작아졌다면 중단한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
        const updateCriteriaDate = this.getNthMonthBefore(updateRange);
        console.log("현재 날짜 : ", moment().format("YYYY-MM-DD"));
        console.log("타겟 날짜 : ", updateCriteriaDate);

        let keepLoop: boolean = true;
        for (let page = 1; keepLoop; page++) {
            /**
             * {page}번째 페이지 조회 결과
             */
            const apiOut = await this.api.listPost({
                access_token,
                blogName: arg.targetBlogName,
                page,
            });

            //
            // 진행상황을 출력한다.
            const lastPage = Math.round(Number(apiOut.item.totalCount) / 10);
            console.log("page", page, "/", lastPage);

            //
            // 작성날짜마다 카운트를 증가시킨다.
            // 단, 기존이력의 마지막 날짜보다 작아지거나,
            // 그래프에 표시되지 않는 1년 이전의 포스트를 발견했다면 중단한다.
            const { posts } = apiOut.item;
            for (const post of posts) {
                /**
                 * "YYYY-MM-DD" 형태의 날짜 문자열
                 */
                const date = post.date.substr(0, 10);
                if (date < updateCriteriaDate) {
                    console.log("stop at", date);
                    keepLoop = false;
                    break;
                }

                //
                // 수집기 대상에 포함된 게시글만 카운팅한다.
                if (this.isInclude(post, includeMask)) {
                    postLog.set(date, (postLog.get(date) || 0) + 1);
                }
            }

            //
            // 마지막 페이지라면 탐색을 그만두고,
            // 아니라면 다음 API 콜과의 텀을 두기위해 잠깐 대기한다.
            if (page === lastPage) {
                keepLoop = false;
            } else {
                //
                // 잠깐 대기한다.
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        console.log("데이터 갱신 완료");

        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            게시글을 스토리지에 저장한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
        await this.save({
            storageBlogName: arg.storageBlogName || arg.targetBlogName,
            storagePostId: arg.storagePostId,
            postLog,
        });

        return postLog;
    }
}
