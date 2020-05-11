/**
 * 게시글 저장 이력.
 *
 * K : 게시글이 1개라도 작성된 날의 날짜. "YYYY-MM-DD" 형태입니다.
 * V : 그 날짜에 작성된 게시글의 개수
 */
export type PostLog = Map<string, number>;

/**
 * TistoryCollector.collect()의 입력
 */
export type CollectInput = {
    /**
     * 이력을 수집할 블로그의 식별자
     * 티스토리 주소 xxx.tistory.com에서 xxx를 나타냅니다.
     */
    targetBlogName: string;

    /**
     * 이력 데이터가 저장될 블로그의 식별자
     * 티스토리 주소 xxx.tistory.com에서 xxx를 나타냅니다.
     * 주어지지 않는다면 targetBlogName과 같은 값을 사용합니다.
     */
    storageBlogName?: string;

    /**
     * 이력 데이터를 저장할 게시글의 식별자
     * 숫자 형태입니다.
     */
    storagePostId: string;
};

/**
 * TistoryCollector.save()의 입력
 */
export type SaveInput = {
    /**
     * 이력 데이터를 저장할 블로그의 식별자
     */
    storageBlogName: string;

    /**
     * 이력 데이터를 저장할 게시글의 식별자
     */
    storagePostId: string;

    /**
     * 저장할 이력 데이터
     */
    postLog: PostLog;
};

/**
 * TistoryCollector.load()의 입력
 */
export type LoadInput = {
    /**
     * 이력 데이터가 저장된 블로그의 식별자
     */
    storageBlogName: string;

    /**
     * 이력 데이터가 저장된 게시글의 식별자
     */
    storagePostId: string;
};

/**
 * TistoryCollector.clear()의 입력
 */
export type ClearInput = {
    /**
     * 이력 데이터가 저장된 블로그의 식별자
     */
    storageBlogName: string;

    /**
     * 이력 데이터가 저장된 게시글의 식별자
     */
    storagePostId: string;
};
