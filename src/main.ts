import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
async function kakaoScrape(url: string): Promise<void> {
    const startTime = performance.now();

    // 브라우저 인스턴스 실행
    const browser = await puppeteer.launch({ headless: false });

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
    page.on('request', (request) => {
        if (request.resourceType() === 'image') {
            request.abort();
        } else {
            request.continue();
        }
    });

    // 페이지 이동 {로딩 완료까지 대기}
    await page.goto(url, { waitUntil: 'networkidle0' });

    let previousReviewCount = 0; // 총 리뷰 수
    let loadMoreVisible = '후기 더보기';
    const expectedReviewCountPerLoad = 5; // 한 번에 로드되는 리뷰의 수
    const additionalWaitTime = 3000; // 추가 대기 시간 (5초)

    while ((loadMoreVisible = '후기 더보기')) {
        try {
            // "더보기" 버튼이 로드될 때까지 대기
            await page.waitForSelector('.txt_more', {
                timeout: 1000,
            });
            await page.evaluate(() => {
                const loadMoreButton = document.querySelector('.txt_more');
                //이 if문에서 뭔가 문제가 있는듯
                if (loadMoreButton?.textContent === '후기 더보기') {
                    loadMoreButton.scrollIntoView(); // 버튼이 화면에 보이도록 스크롤.
                }
            });

            const loadMoreButton = await page.$('.txt_more');

            if (loadMoreButton) {
                await loadMoreButton.click();

                // 참조 해제
                loadMoreButton.dispose();

                // 새로운 리뷰가 로드될 때까지 대기
                // 새로운 리뷰가 하나라도 로드 + 5개의 리뷰가 로드 되었다면 현재 갯수와 이전 갯수 비교 후 트루 펄스 리턴
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
                    '.txt_comment',
                    previousReviewCount,
                    expectedReviewCountPerLoad
                );

                if (newReviewsLoaded) {
                    previousReviewCount = await page.$$eval(
                        'txt_comment',
                        (elements) => elements.length
                    );
                } else {
                    loadMoreVisible = '후기 접기';
                }
            } else {
                loadMoreVisible = '후기 접기';
            }
        } catch (error) {
            console.log(error);
            await page.screenshot({ path: 'error.png' });
            loadMoreVisible = '후기 접기';
            await browser.close();
        }
    }
    const content = await page.content();
    const $ = cheerio.load(content); //뭐지 이건

    const reviews = $('txt_comment')
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
kakaoScrape('https://place.map.kakao.com/9388609');
