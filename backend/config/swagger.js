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
        url: 'http://localhost:3000',
        description: 'Geliştirme Sunucusu',
      },
      {
         url: 'http://localhost:5000',
         description: 'Alternatif Geliştirme Sunucusu'
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
