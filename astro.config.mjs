// @ts-check
import { defineConfig } from 'astro/config';
import Icon from 'astro-icon';

export default defineConfig({
integrations: [Icon()],
output: 'server',
});