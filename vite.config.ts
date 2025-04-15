import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import svg from "@poppanator/sveltekit-svg";
import wasm from "vite-plugin-wasm";

export default defineConfig({
	plugins: [
		wasm(),
		sveltekit(),
		{
			name: "vips-request-middleware",
			configureServer(server) {
				server.middlewares.use((_req, res, next) => {
					res.setHeader(
						"Cross-Origin-Embedder-Policy",
						"require-corp",
					);
					res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
					next();
				});
			},
		},
		svg({
			includePaths: ["./src/lib/assets"],
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: "preset-default",
						params: { overrides: { removeViewBox: false } },
					},
					{ name: "removeAttrs", params: { attrs: "(fill|stroke)" } },
				],
			},
		}),
		viteStaticCopy({
			targets: [
				{
					src: "_headers",
					dest: "",
				},
				{
					src: "node_modules/wasm-vips/lib/vips-*.wasm",
					dest: "_app/immutable/workers",
				},
			],
		}),
	],
	optimizeDeps: {
		exclude: [
			"wasm-vips",
			"@ffmpeg/core-mt",
			"@ffmpeg/ffmpeg",
			"@ffmpeg/util",
		],
	},
	css: {
		preprocessorOptions: {
			scss: {
				api: "modern",
			},
		},
	},
});
