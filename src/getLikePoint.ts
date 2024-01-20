import cheerio from 'cheerio';
import SELECTORS from './tags';

const getLikePoint = (content: string) => {
    const $ = cheerio.load(content);
    const likePointResult: string[] = [];
    const likeTextResult: string[] = [];
    const likeNumResult: string[] = [];
    $(SELECTORS.likePoint).each((index, element) => {
        const likeText = $(element).find(SELECTORS.likePoint_txt);
        likeText.each((i, spanElement) => {
            const likeText = $(spanElement).text().trim();
            likeTextResult.push(likeText);
        });
        const likeNum = $(element).find(SELECTORS.likePoint_num);
        likeNum.each((i, spanElement) => {
            const likeNum = $(spanElement).text().trim();
            likeNumResult.push(likeNum);
        });
    });
    for (let i = 0; i < likeTextResult.length; i++) {
        likePointResult.push(likeTextResult[i]);
        likePointResult.push(likeNumResult[i]);
    }
    return likePointResult;
};

export default getLikePoint;
//output ex)['분위기','22','맛','13', '친절',6]
