import { useMemo } from "react";

export type ParsedPath = {
  basePath: string;
  gptId?: string;
  projectId?: string;
  chatId?: string;
};

export function usePathParsing(pathname: string): ParsedPath {
  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    // Defensive default
    const basePath = segments.length > 0 ? `/${segments[0]}` : "/";

    let gptId: string | undefined;
    let projectId: string | undefined;
    let chatId: string | undefined;

    // /gpt5/:gptId
    if (segments[1] && segments[1] !== "chat" && segments[1] !== "project") {
      gptId = segments[1];
    }

    // /project/:projectId
    const projectIndex = segments.indexOf("project");
    if (projectIndex !== -1) {
      projectId = segments[projectIndex + 1];
    }

    // /chat/:chatId
    const chatIndex = segments.indexOf("chat");
    if (chatIndex !== -1) {
      chatId = segments[chatIndex + 1];
    }

    return {
      basePath,
      gptId,
      projectId,
      chatId
    };
  }, [pathname]);
}
