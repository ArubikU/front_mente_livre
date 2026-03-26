#!/usr/bin/env node

/**
 * Script para generar tipos TypeScript y funciones API desde OpenAPI/Swagger
 * Uso: npm run generate-api
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE_URL = (process.env.API_BASE_URL || 'https://backend.mentelivre.org/').replace(/\/$/, "");
const SWAGGER_URL = `${API_BASE_URL}/swagger.json`;
const SWAGGER_GENERATE_URL = `${API_BASE_URL}/swagger/generate`;
const OUTPUT_DIR = path.join(__dirname, '../src/api');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'openapi.json');
const TYPES_FILE = path.join(OUTPUT_DIR, 'types.ts');
const CLIENT_FILE = path.join(OUTPUT_DIR, 'client.ts');

console.log('🚀 Generando API desde Swagger...\n');
console.log(`📡 URL: ${SWAGGER_URL}\n`);

// Asegurar que el directorio existe
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Función para hacer request HTTP/HTTPS (GET)
function fetch(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
            reject(new Error('Too many redirects'));
            return;
        }

        const client = url.startsWith('https') ? https : http;

        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Handle redirect
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    const urlObj = new URL(url);
                    redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                }
                console.log(`➡️  Redirigiendo a: ${redirectUrl}`);
                resolve(fetch(redirectUrl, maxRedirects - 1));
                return;
            }

            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Función para hacer POST request (para regenerar Swagger)
function fetchPost(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (url.startsWith('https') ? 443 : 80),
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = client.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                // Aceptar 200 o 201 como éxito
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(data);
                } else {
                    // Si hay warnings pero devuelve JSON, intentar parsearlo
                    if (data.trim().startsWith('{')) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

// Función para resolver referencias $ref
function resolveRef(spec, ref) {
    if (!ref || !ref.startsWith('#/')) {
        return null;
    }
    const parts = ref.replace('#/', '').split('/');
    let current = spec;
    for (const part of parts) {
        current = current?.[part];
    }
    return current;
}

// Función para generar tipo TypeScript desde un schema
function generateTypeFromSchema(spec, schema, context = { generatedTypes: new Set(), inlineTypes: [], inlineTypeIndex: 0, inlineTypeNames: new Map() }) {
    if (!schema) {
        return 'unknown';
    }

    // Resolver referencias
    if (schema.$ref) {
        const resolved = resolveRef(spec, schema.$ref);
        if (resolved) {
            const refName = schema.$ref.split('/').pop();
            return refName;
        }
        return 'unknown';
    }

    // Tipos básicos
    if (schema.type === 'string') {
        if (schema.enum) {
            return schema.enum.map(e => `"${e}"`).join(' | ');
        }
        return 'string';
    }
    if (schema.type === 'number' || schema.type === 'integer') {
        return 'number';
    }
    if (schema.type === 'boolean') {
        return 'boolean';
    }
    if (schema.type === 'null') {
        return 'null';
    }

    // Arrays
    if (schema.type === 'array') {
        if (schema.items) {
            // Array con items que son objetos anidados
            if (schema.items.properties || (schema.items.type === 'object' && schema.items.properties)) {
                const schemaKey = JSON.stringify(schema.items);
                let inlineTypeName = context.inlineTypeNames.get(schemaKey);
                if (!inlineTypeName) {
                    inlineTypeName = `Inline${context.inlineTypeIndex + 1}`;
                    context.inlineTypeIndex++;
                    context.inlineTypeNames.set(schemaKey, inlineTypeName);
                    const inlineType = generateInterfaceFromSchema(spec, inlineTypeName, schema.items, context);
                    context.inlineTypes.push(inlineType);
                }
                return `${inlineTypeName}[]`;
            }
            // Array con items que son referencias
            if (schema.items.$ref) {
                const refName = schema.items.$ref.split('/').pop();
                return `${refName}[]`;
            }
            // Array con items que son tipos básicos
            const itemType = generateTypeFromSchema(spec, schema.items, context);
            return `${itemType}[]`;
        }
        return 'unknown[]';
    }

    // Objetos
    if (schema.type === 'object' || schema.properties) {
        // Si tiene additionalProperties, usar Record
        if (schema.additionalProperties === true || (typeof schema.additionalProperties === 'object' && Object.keys(schema.additionalProperties).length === 0)) {
            return 'Record<string, unknown>';
        }
        if (typeof schema.additionalProperties === 'object' && schema.additionalProperties.type) {
            const valueType = generateTypeFromSchema(spec, schema.additionalProperties, context);
            return `Record<string, ${valueType}>`;
        }
        // Generar interface inline si es un objeto anidado
        // Revisar si ya existe una interface similar
        const schemaKey = JSON.stringify(schema);
        let inlineTypeName = context.inlineTypeNames.get(schemaKey);
        if (!inlineTypeName) {
            inlineTypeName = `Inline${context.inlineTypeIndex + 1}`;
            context.inlineTypeIndex++;
            context.inlineTypeNames.set(schemaKey, inlineTypeName);
            const inlineType = generateInterfaceFromSchema(spec, inlineTypeName, schema, context);
            context.inlineTypes.push(inlineType);
        }
        return inlineTypeName;
    }

    return 'unknown';
}

// Función para generar interface desde un schema
function generateInterfaceFromSchema(spec, name, schema, context = { generatedTypes: new Set(), inlineTypes: [] }) {
    let interfaceCode = `export interface ${name} {\n`;

    if (schema.properties && Object.keys(schema.properties).length > 0) {
        const required = schema.required || [];
        Object.keys(schema.properties).forEach(propName => {
            const prop = schema.properties[propName];
            const optional = required.includes(propName) ? '' : '?';
            const propType = generateTypeFromSchema(spec, prop, context);
            interfaceCode += `  ${propName}${optional}: ${propType};\n`;
        });
    } else {
        // Si no hay propiedades, usar Record<string, never> para evitar interfaz vacía
        interfaceCode += `  [key: string]: never;\n`;
    }

    interfaceCode += '}\n';
    return interfaceCode;
}

// Función para generar tipos TypeScript desde OpenAPI
function generateTypes(openapi) {
    const spec = JSON.parse(openapi);
    const context = { generatedTypes: new Set(), inlineTypes: [], inlineTypeIndex: 0, inlineTypeNames: new Map() };

    let types = `// Auto-generated from OpenAPI spec
// DO NOT EDIT MANUALLY - Run 'npm run generate-api' to regenerate

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

`;

    // Generar tipos de schemas de components
    if (spec.components && spec.components.schemas) {
        types += '// Schemas\n';
        Object.keys(spec.components.schemas).forEach(schemaName => {
            if (context.generatedTypes.has(schemaName)) {
                return;
            }
            context.generatedTypes.add(schemaName);
            const schema = spec.components.schemas[schemaName];
            types += generateInterfaceFromSchema(spec, schemaName, schema, context);
            types += '\n';
        });
    }

    // Primero procesar todos los endpoints para generar todos los tipos inline
    if (spec.paths) {
        Object.keys(spec.paths).forEach(path => {
            const pathItem = spec.paths[path];
            Object.keys(pathItem).forEach(method => {
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                    const operation = pathItem[method];

                    // Procesar requestBody para generar tipos inline
                    if (operation.requestBody) {
                        const content = operation.requestBody.content;
                        if (content['application/json'] && content['application/json'].schema) {
                            const schema = content['application/json'].schema;
                            generateTypeFromSchema(spec, schema, context);
                        }
                    }

                    // Procesar responses para generar tipos inline
                    if (operation.responses && operation.responses['200']) {
                        const response = operation.responses['200'];
                        if (response.content && response.content['application/json']) {
                            const schema = response.content['application/json'].schema;
                            if (schema) {
                                generateTypeFromSchema(spec, schema, context);
                            }
                        }
                    }
                }
            });
        });
    }

    // Generar tipos inline después de los principales
    if (context.inlineTypes.length > 0) {
        types += '\n// Inline Types\n';
        // Usar un Set para eliminar duplicados
        const uniqueInlineTypes = [...new Set(context.inlineTypes)];
        uniqueInlineTypes.forEach(inlineType => {
            types += inlineType + '\n';
        });
    }

    // Generar tipos de endpoints
    if (spec.paths) {
        types += '\n// API Endpoints\n';
        types += 'export const API_BASE_URL = "' + (spec.servers?.[0]?.url || API_BASE_URL) + '";\n\n';

        Object.keys(spec.paths).forEach(path => {
            const pathItem = spec.paths[path];
            Object.keys(pathItem).forEach(method => {
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                    const operation = pathItem[method];
                    const operationId = operation.operationId || `${method}_${path.replace(/\//g, '_').replace(/\{|\}/g, '')}`;

                    // Determinar tipos de request/response usando tipos ya generados
                    let requestType = 'void';
                    let responseType = 'unknown';

                    if (operation.requestBody) {
                        const content = operation.requestBody.content;
                        if (content['application/json'] && content['application/json'].schema) {
                            const schema = content['application/json'].schema;
                            requestType = generateTypeFromSchema(spec, schema, context);
                        }
                    }

                    if (operation.responses && operation.responses['200']) {
                        const response = operation.responses['200'];
                        if (response.content && response.content['application/json']) {
                            const schema = response.content['application/json'].schema;
                            if (schema) {
                                responseType = generateTypeFromSchema(spec, schema, context);
                            }
                        }
                    }

                    types += `// ${operation.summary || operationId}\n`;
                    types += `// ${method.toUpperCase()} ${path}\n`;
                    types += `export type ${operationId}_Request = ${requestType};\n`;
                    types += `export type ${operationId}_Response = ApiResponse<${responseType}>;\n\n`;
                }
            });
        });
    }

    return types;
}

// Función para generar cliente API
function generateClient(openapi) {
    const spec = JSON.parse(openapi);
    const baseUrl = spec.servers?.[0]?.url || API_BASE_URL;

    let client = `/**
 * Cliente API auto-generado desde OpenAPI spec
 * Regenerar con: npm run generate-api
 */

import { API_BASE_URL } from './types';
import type * as Types from './types';

export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\\/$/, '');
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = \`\${this.baseUrl}\${endpoint}\`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.token) {
            headers['Authorization'] = \`Bearer \${this.token}\`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(error.message || \`HTTP \${response.status}\`);
        }

        return response.json();
    }

    // Métodos HTTP genéricos
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

`;

    // Generar funciones específicas para cada endpoint
    const generatedMethods = new Set();

    if (spec.paths) {
        client += '    // Endpoints específicos\n';

        Object.keys(spec.paths).forEach(path => {
            const pathItem = spec.paths[path];
            Object.keys(pathItem).forEach(method => {
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                    const operation = spec.paths[path][method];
                    const operationId = operation.operationId || `${method}_${path.replace(/\//g, '_').replace(/\{|\}/g, '')}`;

                    // Generar nombre de función amigable
                    const funcName = operationId
                        .replace(/([A-Z])/g, '_$1')
                        .toLowerCase()
                        .replace(/^_/, '')
                        .replace(/_/g, '')
                        .replace(/^(.)/, (_, c) => c.toLowerCase());

                    // Evitar métodos duplicados (especialmente login/logout)
                    if (generatedMethods.has(funcName)) {
                        return;
                    }
                    generatedMethods.add(funcName);

                    // Extraer parámetros de ruta
                    const pathParams = (path.match(/\{(\w+)\}/g) || []).map(p => p.replace(/\{|\}/g, ''));

                    // Determinar tipos usando la misma lógica que en generateTypes
                    const endpointContext = { generatedTypes: new Set(), inlineTypes: [], inlineTypeIndex: 0, inlineTypeNames: new Map() };
                    let requestType = 'void';

                    if (operation.requestBody) {
                        const content = operation.requestBody.content;
                        if (content['application/json'] && content['application/json'].schema) {
                            const schema = content['application/json'].schema;
                            requestType = generateTypeFromSchema(spec, schema, endpointContext);
                            // Si es un tipo inline, usar el tipo de Request
                            if (requestType.startsWith('Inline')) {
                                requestType = `${operationId}_Request`;
                            }
                        }
                    }

                    // Generar función
                    const params = [];
                    if (pathParams.length > 0) {
                        params.push(...pathParams.map(p => `${p}: string`));
                    }
                    if (requestType !== 'void' && requestType !== 'any') {
                        params.push(`data: Types.${requestType}`);
                    } else if (requestType !== 'void') {
                        // Para login/refresh, usar tipos inline específicos
                        if (operationId === 'login' || operationId === 'refreshToken') {
                            params.push(`data: { username: string; password: string }`);
                        } else {
                            params.push(`data?: any`);
                        }
                    }

                    const paramString = params.join(', ');
                    const pathWithParams = pathParams.reduce((p, param) =>
                        p.replace(`{${param}}`, `\${${param}}`), path
                    );

                    client += `    async ${funcName}(${paramString}): Promise<Types.${operationId}_Response> {\n`;
                    if (method === 'get' || method === 'delete') {
                        client += `        return this.${method}<Types.${operationId}_Response>(\`${pathWithParams}\`);\n`;
                    } else {
                        client += `        return this.${method}<Types.${operationId}_Response>(\`${pathWithParams}\`, ${requestType !== 'void' ? 'data' : 'undefined'});\n`;
                    }
                    client += `    }\n\n`;
                }
            });
        });

        // Métodos de autenticación especiales solo si no fueron generados
        if (!generatedMethods.has('login')) {
            client += `    // Método de login especializado\n`;
            client += `    async login(credentials: { username: string; password: string }): Promise<Types.login_Response> {\n`;
            client += `        const response = await this.post<Types.login_Response>('/auth/login', credentials);\n`;
            client += `        if (response.success && response.data && 'token' in response.data) {\n`;
            client += `            this.setToken((response.data as any).token);\n`;
            client += `        }\n`;
            client += `        return response;\n`;
            client += `    }\n\n`;
        }

        if (!generatedMethods.has('logout')) {
            client += `    // Método de logout especializado\n`;
            client += `    async logout(): Promise<Types.logout_Response> {\n`;
            client += `        const response = await this.post<Types.logout_Response>('/auth/logout');\n`;
            client += `        this.setToken(null);\n`;
            client += `        return response;\n`;
            client += `    }\n`;
        }
    }
    client += `}\n\n`;
    client += `// Instancia singleton\n`;
    client += `export const apiClient = new ApiClient();\n`;

    return client;
}

// Función principal
async function main() {
    try {
        console.log('🔄 Regenerando Swagger en el backend...');
        try {
            // Primero intentar regenerar el Swagger llamando al endpoint POST
            await fetchPost(SWAGGER_GENERATE_URL);
            console.log('✅ Swagger regenerado exitosamente\n');
        } catch (error) {
            // Si falla POST, intentar con GET + parámetro regenerate
            console.log('⚠️  Falló POST, intentando con GET?regenerate=true...');
            try {
                await fetch(`${SWAGGER_URL}?regenerate=true`);
                console.log('✅ Swagger regenerado exitosamente\n');
            } catch (fallbackError) {
                // Si ambos fallan, continuar con el Swagger existente (puede estar actualizado)
                console.log('⚠️  No se pudo regenerar Swagger, usando versión existente\n');
                console.log('   (Esto está bien si el Swagger ya estaba actualizado)\n');
            }
        }

        console.log('📥 Descargando Swagger JSON...');
        const swaggerJson = await fetch(SWAGGER_URL);

        console.log('💾 Guardando OpenAPI spec...');
        fs.writeFileSync(OUTPUT_FILE, swaggerJson);
        console.log(`✅ Guardado en: ${OUTPUT_FILE}\n`);

        console.log('🔨 Generando tipos TypeScript...');
        const types = generateTypes(swaggerJson);
        fs.writeFileSync(TYPES_FILE, types);
        console.log(`✅ Tipos generados en: ${TYPES_FILE}\n`);

        console.log('🔨 Generando cliente API...');
        const client = generateClient(swaggerJson);
        fs.writeFileSync(CLIENT_FILE, client);
        console.log(`✅ Cliente generado en: ${CLIENT_FILE}\n`);

        console.log('✨ ¡API generada exitosamente!\n');
        console.log('📝 Archivos generados:');
        console.log(`   - ${OUTPUT_FILE}`);
        console.log(`   - ${TYPES_FILE}`);
        console.log(`   - ${CLIENT_FILE}\n`);
        console.log('💡 Puedes importar los tipos y funciones en tu código:');
        console.log('   import { Therapist, ApiResponse } from "./api/types";');
        console.log('   import { apiClient } from "./api/client";\n');

    } catch (error) {
        console.error('❌ Error generando API:', error.message);
        console.error('\n💡 Asegúrate de que:');
        console.error('   1. El backend esté corriendo en', API_BASE_URL);
        console.error('   2. El endpoint /swagger.json esté disponible');
        console.error('   3. No haya problemas de CORS\n');
        process.exit(1);
    }
}

main();
