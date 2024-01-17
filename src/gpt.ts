import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const txt_more = 'button.UnderlineButton_button__1XcTX'; // "더보기" 버튼의 선택자
const txt_review = 'span.review-content'; // 리뷰 텍스트의 선택자

async function kakaoMapScrape(url: string): Promise<void> {
    const startTime = Date.now();

    // 브라우저 인스턴스 실행
    const browser = await puppeteer.launch({ headless: false }); // headless 모드를 해제하여 브라우저를 표시
    const page = await browser.newPage();

    await page.setViewport({
        width: 1920,
        height: 1080,
    });

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.resourceType() === 'image') {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        // 페이지 이동 {로딩 완료까지 대기}
        await page.goto(url, { waitUntil: 'networkidle0' });

        let loadMoreVisible = true;
        const additionalWaitTime = 3000;

        while (loadMoreVisible) {
            // "더보기" 버튼이 로드될 때까지 대기
            await page.waitForSelector(txt_more, { timeout: 3000 });

            const loadMoreButton = await page.$(txt_more);

            if (loadMoreButton) {
                await loadMoreButton.click();

                // 새로운 리뷰가 로드될 때까지 대기
                const newReviewsLoaded = await page.waitForFunction(
                    (selector, countPerLoad) => {
                        const currentCount =
                            document.querySelectorAll(selector).length;
                        return currentCount >= countPerLoad;
                    },
                    { timeout: additionalWaitTime }, // 추가 대기 시간 적용
                    txt_review,
                    5 // 한 번에 로드되는 리뷰의 수
                );

                if (!newReviewsLoaded) {
                    loadMoreVisible = false;
                }
            } else {
                loadMoreVisible = false;
            }
        }

        const content = await page.content();
        const $ = cheerio.load(content);

        const reviews = $(txt_review)
            .map((i, element) => $(element).text())
            .get();

        const endTime = Date.now();

        console.log(reviews);
        console.log(`리뷰 수: ${reviews.length}`);
        console.log(`크롤링 소요 시간: ${endTime - startTime}ms`);
    } catch (error) {
        console.error('크롤링 중 오류 발생:', error);
    } finally {
        await browser.close();
    }
}

kakaoMapScrape('https://place.map.kakao.com/9388609');
