import {
    Context,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { collect, clear } from "./api";
import { TistoryCollectorConfig } from "./tistory-collector";

/**
 * 서버리스 람다 핸들러 타입
 */
export type ServerlessHandler = (
    event: APIGatewayProxyEvent,
    context: Context
) => Promise<APIGatewayProxyResult>;

/**
 * 필요하지만 주어지지 않은 인자들의 목록을 반환한다.
 */
function checkParam(argv: any, required: string[]): string[] {
    const notGiven: string[] = [];
    for (const key of required) {
        if (argv[key] === undefined) {
            notGiven.push(key);
        }
    }
    return notGiven;
}

/**
 * 사용자가 건넨 정보에서, 티스토리 API 액세스 정보를 생성한다.
 */
function createTistoryConfig(argv: any): TistoryCollectorConfig {
    return {
        key: {
            client: argv.client,
            secret: argv.secret,
        },
        account: {
            id: argv.id,
            pw: argv.pw,
        },
    };
}

export const handle_collect: ServerlessHandler = async (ev) => {
    try {
        //
        // 인자 체크
        const argv = JSON.parse(ev.body!!);
        const notGiven = checkParam(argv, [
            "targetBlogName",
            "storageBlogName",
            "storagePostId",
            "client",
            "secret",
            "id",
            "pw",
        ]);
        if (0 < notGiven.length) {
            throw new Error(
                `필수인자가 주어지지 않았습니다 : ${JSON.stringify(notGiven)}`
            );
        }

        //
        // API 호출.
        await collect(argv, createTistoryConfig(argv));

        //
        // 성공응답.
        return {
            statusCode: 200,
            body: "OK",
        };
    } catch (e) {
        //
        // 실패응답.
        return {
            statusCode: 500,
            body: e.message,
        };
    }
};

export const handle_clear: ServerlessHandler = async (ev) => {
    try {
        //
        // 인자 체크
        const argv = JSON.parse(ev.body!!);
        const notGiven = checkParam(argv, [
            "storageBlogName",
            "storagePostId",
            "client",
            "secret",
            "id",
            "pw",
        ]);
        if (0 < notGiven.length) {
            throw new Error(
                `필수인자가 주어지지 않았습니다 : ${JSON.stringify(notGiven)}`
            );
        }

        //
        // API 호출.
        await clear(argv, createTistoryConfig(argv));

        //
        // 성공 응답
        return {
            statusCode: 200,
            body: "OK",
        };
    } catch (e) {
        //
        // 실패 응답
        return {
            statusCode: 500,
            body: e.message,
        };
    }
};
