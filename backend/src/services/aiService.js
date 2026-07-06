import { pool, sql } from '../config/db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const aiService = {
  /**
   * Consult customer and recommend products based on message query
   * @param {string} userMessage - Message from customer
   * @returns {Promise<Object>} - { text, recommendedProductIds }
   */
  consult: async (userMessage) => {
    try {
      // 1. Fetch all active products from DB to build context
      const productsRes = await pool.request().query(`
        SELECT p.id, p.name, p.description, p.base_price, c.name AS category_name, s.shop_name
        FROM Products p
        LEFT JOIN ProductCategories pc ON p.id = pc.product_id
        LEFT JOIN Categories c ON pc.category_id = c.id
        LEFT JOIN Shops s ON p.shop_id = s.id
        WHERE p.is_active = 1
      `);

      const dbProducts = productsRes.recordset || [];

      // 2. Try to use Google Gemini API if API KEY exists
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
        try {
          const ai = new GoogleGenerativeAI(apiKey);
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const productsContext = dbProducts.map(p => 
            `ID: ${p.id} | Tên: ${p.name} | Giá: ${p.base_price.toLocaleString('vi-VN')} đ | Danh mục: ${p.category_name} | Shop: ${p.shop_name} | Mô tả: ${p.description}`
          ).join('\n---\n');

          const prompt = `Bạn là Trợ lý AI tư vấn mua vật liệu xây dựng (VLXD) thông minh của sàn thương mại điện tử E-Com FPT.
Nhiệm vụ của bạn là giải đáp thắc mắc và đề xuất loại vật tư tốt nhất cho khách hàng dựa trên nhu cầu của họ.

Dưới đây là DANH SÁCH SẢN PHẨM ĐANG CÓ TRONG KHO HÀNG thực tế:
${productsContext}

Quy tắc bắt buộc:
1. Tư vấn bằng tiếng Việt, lịch sự, thân thiện, chuyên nghiệp, tập trung vào lĩnh vực xây dựng và vật tư.
2. Chỉ được đề xuất các sản phẩm thực tế có trong danh sách trên. Tuyệt đối không tự bịa ra sản phẩm khác.
3. Ở CUỐI câu trả lời của bạn, bạn bắt buộc phải chèn một dòng duy nhất chứa thông tin các sản phẩm được đề xuất theo cú pháp chính xác sau:
[RECOMMENDATION: ["id_san_pham_1", "id_san_pham_2"]]
(Nếu không có sản phẩm nào phù hợp, chèn: [RECOMMENDATION: []])

Tin nhắn của khách hàng: "${userMessage}"
Hãy bắt đầu tư vấn:`;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();

          // Parse recommendations from responseText
          let recommendedProductIds = [];
          const regex = /\[RECOMMENDATION:\s*(\[.*?\])\]/;
          const match = responseText.match(regex);
          
          let cleanedText = responseText;
          if (match) {
            try {
              recommendedProductIds = JSON.parse(match[1]);
            } catch (e) {
              console.error('Failed to parse recommended IDs JSON:', match[1]);
            }
            // Remove the [RECOMMENDATION: ...] line from final display text
            cleanedText = responseText.replace(regex, '').trim();
          }

          return {
            text: cleanedText,
            recommendedProductIds
          };
        } catch (geminiErr) {
          console.error('[🚨 GEMINI API ERROR] Falling back to rule-based system...', geminiErr);
        }
      }

      // 3. FALLBACK: Rule-based keyword matching (100% reliable offline fallback)
      const textNormal = userMessage.toLowerCase();
      let recommendedProductIds = [];
      let replyText = '';

      const keywords = {
        cement: ['gạch', 'xi măng', 'cát', 'đá', 'ốp', 'lát', 'xây', 'tường'],
        steel: ['sắt', 'thép', 'tôn', 'xà gồ', 'móng', 'cột', 'hòa phát'],
        paint: ['sơn', 'chống thấm', 'màu', 'bột trét', 'quét'],
        tech: ['tai nghe', 'chuột', 'bàn phím', 'điện tử', 'đồng hồ', 'amoled', 'âm thanh']
      };

      // Match category
      let matchedCat = '';
      if (keywords.cement.some(k => textNormal.includes(k))) {
        matchedCat = 'cat_cement';
        replyText = 'Chào bạn! Để xây dựng phần thô và hoàn thiện bề mặt công trình, tôi xin đề xuất các loại gạch men và xi măng chất lượng cao từ kho đại lý Đồng Tâm hiện có:';
      } else if (keywords.steel.some(k => textNormal.includes(k))) {
        matchedCat = 'cat_steel';
        replyText = 'Chào bạn! Đối với cốt thép móng và kết cấu chịu lực, thép Hòa Phát là sự lựa chọn hàng đầu. Dưới đây là các sản phẩm thép đang sẵn hàng tại kho Hòa Phát:';
      } else if (keywords.paint.some(k => textNormal.includes(k))) {
        matchedCat = 'cat_paint';
        replyText = 'Chào bạn! Để bảo vệ tường khỏi ẩm mốc và tạo thẩm mỹ cho công trình, bạn có thể tham khảo sản phẩm sơn nước chống thấm chất lượng cao sau:';
      } else if (keywords.tech.some(k => textNormal.includes(k))) {
        matchedCat = 'cat_electronics'; // or related
        replyText = 'Chào bạn! Tôi xin đề xuất các thiết bị điện tử và phụ kiện cao cấp hỗ trợ công trình và văn phòng làm việc dưới đây:';
      } else {
        replyText = 'Chào bạn! Tôi là Trợ lý AI tư vấn vật liệu xây dựng E-Com FPT. Bạn đang cần tìm vật tư cho hạng mục nào (xây thô, đổ móng, sơn tường, gạch ốp lát...)? Hãy tham khảo một số sản phẩm bán chạy nhất của chúng tôi dưới đây:';
        // Pick some featured products
        recommendedProductIds = dbProducts.slice(0, 3).map(p => p.id);
      }

      if (matchedCat) {
        // Find products in DB that match category slug or category name containing the keywords
        // For fallback simplicity, filter from dbProducts list
        const matchedProds = dbProducts.filter(p => 
          p.id === 'prod_001' || p.id === 'prod_002' || p.id === 'prod_003' || p.id === 'prod_004' || p.id === 'prod_005' || p.id === 'prod_006'
        ).filter(p => {
          if (matchedCat === 'cat_cement') return p.name.includes('Gạch') || p.name.includes('Xi măng') || p.name.includes('Cát');
          if (matchedCat === 'cat_steel') return p.name.includes('Thép') || p.name.includes('Sắt') || p.name.includes('Tôn');
          if (matchedCat === 'cat_paint') return p.name.includes('Sơn') || p.name.includes('Thấm');
          return p.id === 'prod_001' || p.id === 'prod_002'; // default tech
        });

        recommendedProductIds = matchedProds.map(p => p.id);
        
        // If still empty, add default
        if (recommendedProductIds.length === 0) {
          recommendedProductIds = dbProducts.slice(0, 2).map(p => p.id);
        }
      }

      return {
        text: replyText,
        recommendedProductIds
      };

    } catch (err) {
      console.error('[AI SERVICE GLOBAL ERROR]', err);
      return {
        text: 'Rất tiếc, Trợ lý AI đang gặp sự cố kết nối dữ liệu. Bạn vui lòng thử lại sau nhé!',
        recommendedProductIds: []
      };
    }
  }
};
