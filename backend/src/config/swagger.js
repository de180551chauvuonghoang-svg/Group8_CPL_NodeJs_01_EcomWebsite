import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Volitify E-commerce API Docs",
      version: "1.0.0",
      description: "Tài liệu API tương tác dùng Swagger UI cho Volitify E-commerce, Authentication và Profile Services.",
      contact: {
        name: "FPT Ecom Team",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Điền access token JWT vào đây dưới dạng: Bearer <token>",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
