import { productService } from '../services/productService.js';

export const getAllProducts = async (req, res) => {
  try {
    const { category, search, brand } = req.query;
    const products = await productService.getAll({ category, search, brand });

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getBrandsList = async (req, res) => {
  try {
    const brands = await productService.getBrandsList();
    res.status(200).json({
      status: 'success',
      results: brands.length,
      data: { brands }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getCategoriesList = async (req, res) => {
  try {
    const categories = await productService.getCategoriesList();
    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: { categories }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, price, description, category, image, stock } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({
        status: 'fail',
        message: 'Product name and price are required'
      });
    }

    const product = await productService.create({ name, price, description, category, image, stock });
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await productService.delete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
