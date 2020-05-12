import { TistoryCollector } from "./tistory-collector";
import { CollectInput, ClearInput } from "./tistory-collector-types";

/**
 * 필수 인자들이 환경변수에 포함되어 있는지 확인한다.
 */
function validateRequired(required: string[]): void {
    const { env } = process;

    //
    // 주어지지 않은 환경변수를 차례대로 삽입한다.
    const notGiven: string[] = [];
    for (const key of required) {
        if (env[key] === undefined) {
            notGiven.push(key);
        }
    }

    //
    // 주어지지 않은 모든 환경변수의 리스트를 취합하여
    // 에러 메세지로 내보낸다.
    if (0 < notGiven.length) {
        throw new Error(
            `다음 환경변수가 주어지지 않았습니다 : ${JSON.stringify(
                notGiven,
                null,
                4
            )}`
        );
    }
}

/**
 * 환경변수 초기화
 */
function init(): void {
    process.env["TISTORY_API_APP_CLIENT"] = process.env["client"];
    process.env["TISTORY_API_APP_SECRET"] = process.env["secret"];
    process.env["TISTORY_API_USER_ID"] = process.env["id"];
    process.env["TISTORY_API_USER_PW"] = process.env["pw"];
}

/**
 * 타겟 블로그의 이력을 스토리지에 저장한다.
 */
export async function collect(): Promise<void> {
    validateRequired([
        "targetBlogName",
        "storagePostId",
        "client",
        "secret",
        "id",
        "pw",
    ]);
    init();

    //
    // API를 호출한다.
    const collector = new TistoryCollector();
    await collector.collect(process.env as CollectInput);
}

/**
 * 스토리지를 초기화한다.
 */
export async function clear(): Promise<void> {
    validateRequired([
        "storageBlogName",
        "storagePostId",
        "client",
        "secret",
        "id",
        "pw",
    ]);
    init();

    //
    // API를 호출한다.
    const collector = new TistoryCollector();
    await collector.clear(process.env as ClearInput);
}
