import yargs from "yargs";
import { TistoryKey, TistoryAccountInfo } from "tistory-js/v1";
import prompts from "prompts";
import { collect, clear } from "./api";
import { TistoryCollectorConfig } from "./tistory-collector";

interface CreateConfigArgs {
    client?: string;
    secret?: string;
    id?: string;
    pw?: string;
}

async function createConfig(
    argv: CreateConfigArgs
): Promise<TistoryCollectorConfig> {
    //
    // TistoryKey를 생성한다.
    let key: TistoryKey | undefined = undefined;
    if (argv.client || argv.secret) {
        if (!argv.client || !argv.secret) {
            throw new Error(`{client}와 {secret}은 함께 주어져야 합니다.`);
        } else {
            key = {
                client: argv.client,
                secret: argv.secret,
            };
        }
    }

    //
    // AccountInfo를 생성한다.
    let account: TistoryAccountInfo | undefined = undefined;
    if (argv.id) {
        if (argv.pw) {
            //
            // 명시적으로 주어진 패스워드 사용.
            account = {
                id: argv.id,
                pw: argv.pw,
            };
        } else {
            //
            // 명시적으로 패스워드가 주어지지 않았다면 물어본다.
            const response = await prompts({
                type: "password",
                name: "pw",
                message: "비밀번호를 입력해주세요 : ",
            });
            account = {
                id: argv.id,
                pw: response.pw,
            };
        }
    }

    return { key, account };
}

yargs
    .command(
        "collect",
        "타겟 블로그의 포스팅 이력을 추출하여 스토리지 게시글에 저장합니다.",
        {},
        async () => {
            const { argv } = yargs
                .string([
                    "targetBlogName",
                    "storageBlogName",
                    "storagePostId",
                    "client",
                    "secret",
                    "id",
                    "pw",
                ])
                .describe("targetBlogName", "타겟 블로그 식별자")
                .describe(
                    "storageBlogName",
                    "스토리지 블로그 식별자 (기본값=targetBlogName)"
                )
                .describe("storagePostId", "스토리지 게시글 식별자")
                .describe("client", "티스토리에서 발급받은 클라이언트 키")
                .describe("secret", "티스토리에서 발급받은 시크릿 키")
                .describe("id", "티스토리 로그인 아이디")
                .describe(
                    "pw",
                    "티스토리 로그인 비밀번호 (주어지지 않은 경우 프롬프트에서 입력)"
                )
                .demandOption(["targetBlogName", "storagePostId"]);

            //
            // API를 호출한다.
            await collect(argv, await createConfig(argv));
        }
    )
    .command("clear", "스토리지 게시글을 지웁니다.", {}, async () => {
        const { argv } = yargs
            .string([
                "storageBlogName",
                "storagePostId",
                "client",
                "secret",
                "id",
                "pw",
            ])
            .describe("storageBlogName", "스토리지 블로그 식별자")
            .describe("storagePostId", "스토리지 게시글 식별자")
            .describe("client", "티스토리에서 발급받은 클라이언트 키")
            .describe("secret", "티스토리에서 발급받은 시크릿 키")
            .describe("id", "티스토리 로그인 아이디")
            .describe(
                "pw",
                "티스토리 로그인 비밀번호 (주어지지 않은 경우 프롬프트에서 입력)"
            )
            .demandOption(["storageBlogName", "storagePostId"]);

        //
        // API를 호출한다.
        await clear(argv, await createConfig(argv));

        console.log("완료되었습니다.");
    })
    .demandCommand().argv;
