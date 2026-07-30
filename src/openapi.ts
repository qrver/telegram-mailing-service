export const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'Telegram Mailing Service API',
        version: '1.0.0',
        description: 'API для создания, планирования и отслеживания Telegram-рассылок.',
    },
    servers: [{ url: '/' }],
    tags: [
        { name: 'Mailings', description: 'Управление рассылками' },
        { name: 'System', description: 'Состояние сервиса' },
    ],
    components: {
        securitySchemes: { apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
        schemas: {
            Button: {
                type: 'object',
                required: ['text', 'url'],
                properties: {
                    text: { type: 'string', example: 'Открыть сайт' },
                    url: { type: 'string', format: 'uri' },
                    type: { type: 'string', enum: ['url', 'web_app'] },
                },
            },
            Recipient: {
                type: 'object',
                required: ['telegramId'],
                properties: {
                    telegramId: { type: 'string', example: '123456789' },
                    username: { type: 'string' },
                },
            },
            CreateMailing: {
                type: 'object',
                required: ['text', 'recipients'],
                properties: {
                    title: { type: 'string' },
                    text: { type: 'string', maxLength: 4096 },
                    type: { type: 'string', enum: ['text', 'photo'], default: 'text' },
                    photoUrl: { type: 'string', format: 'uri' },
                    sendAt: { type: 'string', format: 'date-time' },
                    buttons: { type: 'array', items: { $ref: '#/components/schemas/Button' } },
                    recipients: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Recipient' },
                    },
                },
            },
        },
    },
    paths: {
        '/health': {
            get: {
                tags: ['System'],
                summary: 'Проверка состояния',
                responses: {
                    '200': { description: 'Сервис доступен' },
                    '503': { description: 'Есть недоступная зависимость' },
                },
            },
        },
        '/docs': {
            get: {
                tags: ['System'],
                summary: 'Swagger UI',
                responses: { '200': { description: 'Документация' } },
            },
        },
        '/api/mailings': {
            get: {
                tags: ['Mailings'],
                summary: 'Список рассылок',
                security: [{ apiKey: [] }],
                responses: { '200': { description: 'Список рассылок' } },
            },
            post: {
                tags: ['Mailings'],
                summary: 'Создать рассылку',
                security: [{ apiKey: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateMailing' },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Рассылка создана' },
                    '400': { description: 'Ошибка валидации' },
                },
            },
        },
        '/api/mailings/{id}': {
            get: {
                tags: ['Mailings'],
                summary: 'Получить рассылку и статистику',
                security: [{ apiKey: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    '200': { description: 'Рассылка' },
                    '404': { description: 'Не найдена' },
                },
            },
        },
        '/api/mailings/{id}/start': {
            post: {
                tags: ['Mailings'],
                summary: 'Запустить или запланировать рассылку',
                security: [{ apiKey: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: { '202': { description: 'Принято в обработку' } },
            },
        },
        '/api/mailings/{id}/cancel': {
            post: {
                tags: ['Mailings'],
                summary: 'Отменить рассылку',
                security: [{ apiKey: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: { '200': { description: 'Отменено' } },
            },
        },
        '/api/mailings/{id}/test': {
            post: {
                tags: ['Mailings'],
                summary: 'Отправить тестовое сообщение',
                security: [{ apiKey: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['telegramId'],
                                properties: { telegramId: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: { '200': { description: 'Тест отправлен' } },
            },
        },
        '/api/queue': {
            get: {
                tags: ['System'],
                summary: 'Состояние очереди',
                security: [{ apiKey: [] }],
                responses: { '200': { description: 'Состояние очереди' } },
            },
        },
    },
} as const;
