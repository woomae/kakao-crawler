import cheerio from 'cheerio';
import SELECTORS from './tags';

const cralwer = (content: string) => {
    const $ = cheerio.load(content);
    const results: string[] = [];

    $(SELECTORS.reviewList).each((index, element) => {
        const reviewText = $(element).find(SELECTORS.text).text().trim();
        results.push(reviewText);
    });
    const setResult = [...new Set(results)]; //빈문자열제거 및 중복제거(set 집합으로 만듦)
    return setResult;
};

export default cralwer;
