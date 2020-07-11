/**
 * @author AeroCode
 *
 * @blog   https://aerocode.net
 * @github https://github.com/MyAeroCode/tistory-contribution-graph
 */
() => {};

/**
 * 티스토리 컨트리뷰션 그래프 로더
 *
 *
 * @param  graphId {string} #을 포함한 그래프 요소 식별자
 * @param  storagePostId {number} 스토리지 게시글의 숫자 형태 식별자 ex) ~.tistory.com/xxx
 * @param  viewHeader {boolean} "~ [post|posts] in last year" 메세지를 표시합니다. (기본값 true)
 *
 * @warnning
 *         CORS 제약에 따라 다른 블로그의 스토리지 게시글을 얻어올 수 없습니다.
 *         적용하고자 하는 블로그의 포스트 식별자를 사용해주세요.
 */
async function loadTistoryContributionGraph(
    graphId,
    storagePostId,
    viewHeader = true
) {
    //
    // 최상단 변수의 스코프를 끌어내린다.
    var $;
    var jQuery;

    //
    // jQuery에 github_graph 함수를 삽입한 뒤, jq 변수에 할당한다.
    let jq = undefined;
    const jqCandidateList = [$, jQuery];
    for (const jqCandidate of jqCandidateList) {
        if (jqCandidate && jqCandidate.fn && !jq) {
            try {
                init_github_graph(jqCandidate);
                jq = jqCandidate;
            } catch (e) {
                //
                // nothing.
            }
        }
    }

    //
    // jQuery를 찾았는지 검사한다.
    if (!jq) {
        throw new Error(`jQuery를 감지할 수 없습니다.`);
    }

    //
    // 컨트리뷰션 그래프를 렌더링한다.
    let github_graph_data;
    try {
        //
        // 스토리지 게시글의 URL을 조합하고,
        // 그 게시글의 HTML 문자열을 가져온다.
        // CORS 제약에 의해, 다른 블로그의 스토리지 게시글은 가져올 수 없다.
        const storagePostUrl = `${window.location.origin}/${storagePostId}`;
        const storagePostRes = await fetch(storagePostUrl);
        const storagePostHtml = await storagePostRes.text();

        //
        // 가져온 HTML 문자열을 파싱하기 위해,
        // 홀더를 생성하고 거기에 흘려넣는다.
        const htmlHolder = document.createElement("html");
        htmlHolder.innerHTML = storagePostHtml;

        //
        // 홀더에서 데이터가 담긴 요소를 선택하고,
        // 데이터 요소에 담긴 문자열을 가져온다.
        const dataElem = htmlHolder.querySelector("#__LOG_DATA__");
        const dataText = dataElem.textContent;

        //
        // 데이터를 github_contribution가 요구하는 형식으로 파싱한다.
        // 요구하는 형식은 `YYYY-MM-DD` 문자열로만 이루어진 중복가능한 배열이다.
        //
        // 데이터는 다음과 같은 형식을 따른다.
        //
        //     1. 데이터는 여러개의 토큰으로 이루어져있고, 공백으로 구분되어 있다.
        //     2. 각 토큰은 `YYYY-MM-DD`와 `count`가 콜론으로 구분된 문자열이다.
        //        ex) 2020-05-13:4
        //
        const parsed = [];
        const tokens = dataText.split(" ");
        for (const token of tokens) {
            const e = token.split(":");
            const date = e[0];
            const cnt = Number(e[1]);
            for (let i = 0; i < cnt; i++) {
                parsed.push(date);
            }
        }

        //
        // 끝까지 정상적으로 파싱되었을 때만,
        // 파싱된 결과를 대입한다.
        github_graph_data = parsed;
    } catch (e) {
        //
        // 에러 발생.
        github_graph_data = [];
        console.warn(`데이터 불러오기 실패 : `, e);
    } finally {
        //
        // 파싱결과를 사용하여 컨트리뷰션 그래프를 렌더링한다.
        jq(graphId).github_graph({
            data: github_graph_data,
            texts: ["개의 포스트", "개의 포스트"],
            h_days: ["월", "수", "금"],
            month_names: [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
            ],
            viewHeader,
        });
    }
}
