import { pool, sql } from '../config/db.js';

// Bản đồ từ khóa → category để lọc chính xác hơn
const CATEGORY_MAP = {
  'pc': 'PC', 'máy tính': 'PC', 'may tinh': 'PC', 'computer': 'PC',
  'build': 'PC', 'gaming': 'PC', 'game': 'PC', 'render': 'PC',
  'stream': 'PC', 'đồ họa': 'PC', 'do hoa': 'PC', 'lap rap': 'PC',
  'lắp ráp': 'PC', 'cấu hình': 'PC', 'cau hinh': 'PC',
  
  'bếp': 'Kitchen', 'bep': 'Kitchen', 'kitchen': 'Kitchen',
  'nấu': 'Kitchen', 'nau': 'Kitchen', 'nấu ăn': 'Kitchen',
  'lò': 'Kitchen', 'lo': 'Kitchen', 'chảo': 'Kitchen',
  'nội thất bếp': 'Kitchen', 'setup bếp': 'Kitchen',
  
  'smarthome': 'SmartHome', 'smart home': 'SmartHome', 'smart': 'SmartHome',
  'thông minh': 'SmartHome', 'thong minh': 'SmartHome',
  'tivi': 'SmartHome', 'tv': 'SmartHome', 'loa': 'SmartHome',
  'camera': 'SmartHome', 'phòng khách': 'SmartHome', 'phong khach': 'SmartHome'
};

// Hàm nhận diện category từ câu hỏi
function detectCategory(queryStr) {
  const lower = queryStr.toLowerCase().trim();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return null;
}

export const searchCombos = async (req, res) => {
  try {
    const { query, budget } = req.query;
    
    if (!pool) {
      return res.status(500).json({ status: 'error', message: 'Database pool not initialized' });
    }

    const detectedCategory = query ? detectCategory(query) : null;
    const targetBudget = budget ? parseFloat(budget) : null;
    const hasBudget = targetBudget && !isNaN(targetBudget) && targetBudget > 0;

    // ============ LẦN 1: Tìm chính xác (category + giá) ============
    let result = await searchDB({
      category: detectedCategory,
      budget: hasBudget ? targetBudget : null,
      budgetRange: 0.3, // +-30%
      query: query
    });

    // ============ LẦN 2 (FALLBACK): Nếu 0 kết quả → bỏ lọc giá, giữ category ============
    if (result.length === 0 && detectedCategory && hasBudget) {
      result = await searchDB({
        category: detectedCategory,
        budget: null, // Bỏ lọc giá
        query: query,
        fallback: true
      });

      // Trả kết quả kèm ghi chú để AI biết là fallback
      return res.status(200).json({
        status: 'success',
        results: result.length,
        note: `Không tìm thấy sản phẩm ${detectedCategory} trong tầm giá ${targetBudget.toLocaleString('vi-VN')}đ. Dưới đây là tất cả sản phẩm ${detectedCategory} hiện có.`,
        data: result
      });
    }

    // ============ LẦN 3 (FALLBACK cuối): Nếu vẫn 0 → trả tất cả sản phẩm ============
    if (result.length === 0) {
      result = await searchDB({ query: query });
    }

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: result
    });

  } catch (err) {
    console.error('[AI Combo Search Error]:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// ============ HÀM TÌM KIẾM CHUNG ============
async function searchDB({ category = null, budget = null, budgetRange = 0.3, query = null, fallback = false }) {
  const request = pool.request();
  let dbQuery = `SELECT TOP 5 * FROM ProductCombos WHERE is_active = 1`;

  // Lọc category
  if (category) {
    request.input('category', sql.NVarChar, category);
    dbQuery += ` AND category = @category`;
  }

  // Lọc giá
  if (budget) {
    request.input('minBudget', sql.Decimal(15,2), budget * (1 - budgetRange));
    request.input('maxBudget', sql.Decimal(15,2), budget * (1 + budgetRange));
    dbQuery += ` AND price BETWEEN @minBudget AND @maxBudget`;
    request.input('targetBudget', sql.Decimal(15,2), budget);
  }

  // Lọc keyword (chỉ khi không có category, tránh lọc quá chặt)
  if (query && !category) {
    const words = query.toLowerCase().trim().split(/\s+/).filter(w => w.length >= 2 && !/^\d+$/.test(w));
    if (words.length > 0) {
      const conditions = words.map((word, i) => {
        const paramName = `kw${i}`;
        request.input(paramName, sql.NVarChar, `%${word}%`);
        return `(use_case LIKE @${paramName} OR category LIKE @${paramName} OR name LIKE @${paramName} OR description LIKE @${paramName} OR specs_summary LIKE @${paramName})`;
      });
      dbQuery += ` AND (${conditions.join(' OR ')})`;
    }
  }

  // Sắp xếp
  if (budget) {
    dbQuery += ` ORDER BY ABS(price - @targetBudget) ASC`;
  } else {
    dbQuery += ` ORDER BY price ASC`;
  }

  const result = await request.query(dbQuery);
  return result.recordset;
}
