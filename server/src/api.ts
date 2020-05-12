import { TistoryCollector, TistoryCollectorConfig } from "./tistory-collector";
import { CollectInput, ClearInput } from "./tistory-collector-types";

export async function collect(arg: CollectInput, ctx?: TistoryCollectorConfig) {
    const collector = new TistoryCollector(ctx);
    const postLog = await collector.collect(arg);
}

export async function clear(arg: ClearInput, ctx?: TistoryCollectorConfig) {
    const collector = new TistoryCollector(ctx);
    const postLog = await collector.clear(arg);
}
