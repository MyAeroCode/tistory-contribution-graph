import { TistoryApi, TistoryKey, TistoryAccountInfo } from "tistory-js/v1";
import {
    CollectInput,
    PostLog,
    SaveInput,
    LoadInput,
    ClearInput,
} from "./tistory-collector-types";
import { parse, HTMLElement } from "node-html-parser";

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
            .sort((a, b) => Number(a < b))
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
            title: `게시글 이력 (Updated At ${new Date().toLocaleString()})`,
            content: `<div id="${this.logDivId}">${serializedLog}</div>`,
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
        if (apiOut.item.content === "") {
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
            const key = String(smallPart[0]);
            const cnt = Number(smallPart[1]);
            postLog.set(key, cnt);
        });
        console.log("데이터 로딩 완료");
        return postLog;
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
        // 내용을 빈 문자열로 덮어쓴다.
        await this.api.modifyPost({
            access_token,
            blogName: arg.storageBlogName,
            postId: arg.storagePostId,
            title: `게시글 이력 (Updated At ${new Date().toLocaleString()})`,
            content: "",
        });
        console.log("데이터 초기화 완료");
    }

    /**
     * 주어진 이력에서 가장 마지막 날짜를 가져옵니다.
     * 빈 이력이 주어진다면 "0000-00-00"을 반환합니다.
     */
    private getLastDateOfPostLog(log: PostLog): string {
        //
        // 빈 이력이 주어졌을 때.
        if (log.size === 0) {
            return "0000-00-00";
        } else {
            const lastDate = Array.from(log.keys()).reduce(function comparator(
                prev,
                curr
            ) {
                return prev < curr ? curr : prev;
            });
            console.log("마지막 이력 날짜", lastDate);
            return lastDate;
        }
    }

    /**
     * 어떤 블로그의 전체 포스팅 이력을 가져옵니다.
     * {k:날짜, v:개수}로 이루어진 Map을 반환합니다.
     */
    public async collect(arg: CollectInput): Promise<PostLog> {
        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            액세스 토큰을 취득한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
        const code = await this.api.getCodeViaAccountInfo(this.account);
        const access_token = await this.api.getAccessTokenViaCode(code);

        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            스토리지 게시글에서 기존이력 정보와,
            기존이력에 저장된 가장 마지막 날짜를 가져온다.

            가장 마지막 날짜에 블로거가 게시글을 더 작성했을 수 있으므로,
            기존이력에서 마지막 날짜의 카운트를 제거한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
        const postLog: PostLog = await this.load({
            storageBlogName: arg.storageBlogName || arg.targetBlogName,
            storagePostId: arg.storagePostId,
        });
        const lastDate = this.getLastDateOfPostLog(postLog);
        postLog.delete(lastDate);

        /* ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
            최근 페이지부터 순회하며,
            기존이력에 저장된 마지막 날짜보다 작아질 때까지 카운팅을 수행한다.
        ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ */
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
            // 진행상황을 출력
            const lastPage = Math.round(Number(apiOut.item.totalCount) / 10);
            console.log("page", page, "/", lastPage);
            const { posts } = apiOut.item;

            //
            // 작성날짜마다 카운트를 증가시킨다.
            // 단, 기존이력의 마지막 날짜보다 작아진다면 중단한다.
            for (const post of posts) {
                /**
                 * "YYYY-MM-DD" 형태의 날짜 문자열
                 */
                const date = post.date.substr(0, 10);
                if (date < lastDate) {
                    keepLoop = false;
                    break;
                }
                postLog.set(date, (postLog.get(date) || 0) + 1);
            }

            //
            // 마지막 페이지라면 탐색을 그만둔다.
            if (page === lastPage) {
                keepLoop = false;
            }

            //
            // 잠깐 대기한다.
            await new Promise((resolve) => setTimeout(resolve, 100));
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
