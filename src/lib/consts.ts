import { PUB_ENV } from "$env/static/public";

export const GITHUB_URL_VERT = "https://github.com/VERT-sh/VERT";
export const GITHUB_URL_VERTD = "https://github.com/VERT-sh/vertd";
export const GITHUB_API_URL = "https://api.github.com/repos/VERT-sh/VERT";
export const DISCORD_URL = "https://discord.gg/kqevGxYPak";

// 使用默认值以防环境变量未设置
const ENV = PUB_ENV || "production";

export const VERT_NAME =
	ENV === "development"
		? "VERT Local"
		: ENV === "nightly"
			? "VERT Nightly"
			: "VERT.sh";
export const CONTACT_EMAIL = "hello@vert.sh";
