import {
    Context,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { collect, clear } from "./api";

/**
 * 서버리스 람다 핸들러 타입
 */
export type ServerlessHandler = (
    event: APIGatewayProxyEvent,
    context: Context
) => Promise<APIGatewayProxyResult>;

/**
 * collect 함수를 호출하는 핸들러
 */
export const handle_collect: ServerlessHandler = async () => {
    try {
        await collect();
        return {
            statusCode: 200,
            body: "OK",
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: e.message,
        };
    }
};

/**
 * clear 함수를 호출하는 핸들러
 */
export const handle_clear: ServerlessHandler = async () => {
    try {
        await clear();
        return {
            statusCode: 200,
            body: "OK",
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: e.message,
        };
    }
};
