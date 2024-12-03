const jsonServer = require("json-server");
const cors = require('cors'); // Import the CORS middleware

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(cors()); // This will allow CORS for all origins. You can also customize it as needed.


const validateTheme = (theme) => {
  const validThemes = ['all', 'halloween', 'light', 'dark', 'colorful'];
  return validThemes.includes(theme.toLowerCase());
};

const validateTier = (tier) => {
  const validTiers = ['all', 'basic', 'premium', 'deluxe'];
  return validTiers.includes(tier.toLowerCase());
}

const toCamelCase = (str) => {
  return str
      .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => 
          index === 0 ? match.toLowerCase() : match.toUpperCase()
      )
      .replace(/\s+/g, '')  // Remove spaces
      .replace(/[^a-zA-Z0-9]/g, '');  // Remove non-alphanumeric characters
}


const validateCategory = (category) => {
  const validCategory = [
    'all', 'upperBody', 'lowerBody', 'hat', 'shoes', 
    'accessory', 'legendary', 'mythic', 'epic', 'rare'
  ];

  return validCategory.includes(category)
}

const getDateRangeFromPeriod = (period) => {
  const now = new Date();
  const toDate = now;
  let fromDate = new Date();

  switch (period) {
      case '3d':
          fromDate.setDate(now.getDate() - 3);
          break;
      case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
      case '30d':
      default:
          fromDate.setDate(now.getDate() - 30);
          break;
  }
  return { fromDate, toDate };
};

server.get('/api/products', (req, res) => {
  try {
    const db = router.db;
    let products = db.get('products').value();

    // Title search 
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      products = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm)
      );
    }

    // Theme filter 
    if (req.query.theme && req.query.theme !== 'all') {
      if (!validateTheme(req.query.theme)) {
        return res.status(400).json({ error: 'Invalid theme' });
      }
      products = products.filter(product =>
        product.theme.toLowerCase() === req.query.theme.toLowerCase()
      );
    }

    // Tier filter 
    if (req.query.tier && req.query.tier !== 'all') {
      if (!validateTier(req.query.tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }
      products = products.filter(product =>
        product.tier.toLowerCase() === req.query.tier.toLowerCase()
      );
    }

    if (req.query.category && req.query.category !== 'all') {
      if (!validateCategory(req.query.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      products = products.filter(product =>
        toCamelCase(product.category) === req.query.category
      );
    }


    if (req.query.period) {
      const { fromDate, toDate } = getDateRangeFromPeriod(req.query.period);
      
      products = products.filter(product => {
          const productDate = new Date(product.createdAt);
          return productDate >= fromDate && productDate <= toDate;
      });
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      const minPrice = parseFloat(req.query.minPrice) || 0;
      const maxPrice = parseFloat(req.query.maxPrice) || Infinity;

      if (isNaN(minPrice) || isNaN(maxPrice)) {
        return res.status(400).json({ error: 'Invalid price format' });
      }

      products = products.filter(product => {
        const price = parseFloat(product.price);
        return price >= minPrice && price <= maxPrice;
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const totalPages = Math.ceil(products.length / limit);
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      data: paginatedProducts,
      metadata: {
        total: products.length,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

server.use(middlewares);
server.use(router);

const port = 3000;
server.listen(port, () => {
  console.log(`JSON Server is running at http://localhost:${port}`);
});

