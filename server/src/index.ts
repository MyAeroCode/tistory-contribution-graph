import yargs from "yargs";
import { collect, clear } from "./api";

//
// env 파일에서 환경변수를 얻어온다.
import dotenv from "dotenv";
dotenv.config();

yargs
    .command("collect", "스토리지를 업데이트합니다.", {}, async () => {
        try {
            await collect();
        } catch (e) {
            console.log(e.message);
        }
    })
    .command("clear", "스토리지를 초기화합니다.", {}, async () => {
        try {
            await clear();
        } catch (e) {
            console.log(e.message);
        }
    })
    .demandCommand().argv;
