const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Wardrobe AI API',
      version: '1.0.0',
      description: 'Smart Wardrobe AI Backend API Dokümantasyonu',
    },
    servers: [
      {
        url: '/',
        description: 'Smart Wardrobe Başlangıç Sunucusu',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Login işleminden aldığınız access token değerini buraya girin.',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
