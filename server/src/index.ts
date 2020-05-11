import { TistoryCollector } from "./tistory-collector";

async function main() {
    try {
        /**
         * 티스토리 수집기 생성.
         */
        const collector = new TistoryCollector();

        /**
         * 데이터를 수집할 블로그의 식별자
         */
        const targetBlogName = "dailyheumsi";

        /**
         * 데이터가 저장될 블로그의 식별자
         */
        const storageBlogName = "dev-aerolabs";

        /**
         * 데이터가 저장될 게시글(스토리지)의 식별자
         */
        const storagePostId = "19";

        //
        // 스토리지를 초기화한다.
        await collector.clear({
            storageBlogName,
            storagePostId,
        });

        //
        // 포스팅 이력을 갱신하고, 스토리지에 덮어쓴다.
        const postLog = await collector.collect({
            targetBlogName,
            storageBlogName,
            storagePostId,
        });

        //
        // 포스팅 이력을 출력한다.
        console.log(postLog);
    } catch (e) {
        //
        // 에러 발생.
        console.error(e);
    }
}
main();

console.log(process.argv.slice(2));
