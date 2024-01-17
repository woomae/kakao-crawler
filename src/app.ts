import puppeteer from "puppeteer";
import cheerio from "cheerio";

async function scrapeWebsite(url: string): Promise<void> {
    const startTime = performance.now();

    // 브라우저 인스턴스 실행
    const browser = await puppeteer.launch({ headless: "new" });

    // 새 페이지 열기
    const page = await browser.newPage();

    // 페이지 크기 설정
    await page.setViewport({
        width: 1920,
        height: 1080,
    });

    // 네트워크 요청 가로채기 활성화
    await page.setRequestInterception(true);

    // 네트워크 요청을 가로채서 이미지 요청 차단
    page.on("request", (request) => {
        if (request.resourceType() === "image") {
            request.abort();
        } else {
            request.continue();
        }
    });

    // 페이지 이동 {로딩 완료까지 대기}
    await page.goto(url, { waitUntil: "networkidle0" });

    let previousReviewCount = 0; // 총 리뷰 수
    let loadMoreVisible = true;
    const expectedReviewCountPerLoad = 10; // 한 번에 로드되는 리뷰의 수
    const additionalWaitTime = 3000; // 추가 대기 시간 (5초)

    while (loadMoreVisible) {
        try {
            await page.waitForSelector(".TeItc", { timeout: 1000 }); // "더보기" 버튼이 로드될 때까지 대기
            await page.evaluate(() => {
                const loadMoreButton = document.querySelector(".TeItc");
                if (loadMoreButton) {
                    loadMoreButton.scrollIntoView(); // 버튼이 화면에 보이도록 스크롤.
                }
            });

            const loadMoreButton = await page.$(".TeItc");

            if (loadMoreButton) {
                await loadMoreButton.click();

                // 참조 해제
                loadMoreButton.dispose();

                // 새로운 리뷰가 로드될 때까지 대기
                // 새로운 리뷰가 하나라도 로드 + 10개의 리뷰가 로드 되었다면 현재 갯수와 이전 갯수 비교 후 트루 펄스 리턴
                const newReviewsLoaded = await page.waitForFunction(
                    (selector, previousCount, countPerLoad) => {
                        const currentCount =
                            document.querySelectorAll(selector).length;
                        return (
                            currentCount > previousCount ||
                            currentCount >= previousCount + countPerLoad
                        );
                    },
                    { timeout: additionalWaitTime }, // 추가 대기 시간 적용
                    ".zPfVt",
                    previousReviewCount,
                    expectedReviewCountPerLoad
                );

                if (newReviewsLoaded) {
                    previousReviewCount = await page.$$eval(
                        ".zPfVt",
                        (elements) => elements.length
                    );
                } else {
                    loadMoreVisible = false;
                }
            } else {
                loadMoreVisible = false;
            }
        } catch (error) {
            console.log(error);
            await page.screenshot({ path: "error.png" });
            loadMoreVisible = false;
        }
    }
    const content = await page.content();
    const $ = cheerio.load(content);

    const reviews = $(".zPfVt")
        .map((i, element) => {
            const reviewText = $(element).text();
            return reviewText;
        })
        .get();
    const endTime = performance.now();

    console.log(reviews);
    console.log(reviews.length);
    console.log(`크롤링 소요 시간: ${(endTime - startTime).toFixed(3)}ms`);
    // await browser.close();
}

scrapeWebsite(
    "https://pcmap.place.naver.com/restaurant/1703066435/review/visitor"
);
