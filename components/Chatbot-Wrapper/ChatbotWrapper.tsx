'use client';
import { addUrlDataHoc } from "@/hoc/addUrlDataHoc";
import { useEmbeddingScriptEventHandler } from "@/hooks/CORE/eventHandlers/embeddingScript/embeddingScriptEventHandler";
import { useLocalStorageEventHandler } from "@/hooks/CORE/eventHandlers/localStorage/localStorageEventsHandler";
import React, { createContext, useEffect, useRef } from "react";
import Chatbot from "../Chatbot/Chatbot";

interface ChatbotWrapperProps {
  tabSessionId: string;
  chatSessionId: string;
}
interface ChatContextType {
  chatSessionId: string;
  tabSessionId: string;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Create a separate component for the hooks that need context
function ChatbotWithHooks({ tabSessionId, chatSessionId }: { tabSessionId: string, chatSessionId: string }) {
  useEmbeddingScriptEventHandler(tabSessionId);
  useLocalStorageEventHandler(tabSessionId);

  if (!chatSessionId) {
    return null
  }

  return <Chatbot />;
}

function ChatbotWrapper({ tabSessionId, chatSessionId }: ChatbotWrapperProps) {
  const gPressedRef = useRef(false);
  const gShortcutTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  // Notify parent when interface is loaded
  useEffect(() => {
    setTimeout(() => {
      window?.parent?.postMessage({ type: "interfaceLoaded" }, "*");
    }, 0);
  }, []);

  useEffect(() => {
    const clearGShortcutTimeout = () => {
      if (gShortcutTimeoutRef.current) {
        window.clearTimeout(gShortcutTimeoutRef.current);
        gShortcutTimeoutRef.current = null;
      }
    };

    const resetGShortcutState = () => {
      gPressedRef.current = false;
      clearGShortcutTimeout();
    };

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };

    const postShortcutToParent = (payload: Record<string, unknown>) => {
      window?.parent?.postMessage({ type: "CHATBOT_SHORTCUT", ...payload }, "*");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "g") {
        gPressedRef.current = true;
        clearGShortcutTimeout();
        gShortcutTimeoutRef.current = window.setTimeout(resetGShortcutState, 1000);
        return;
      }

      if (gPressedRef.current && ["h", "c", "t"].includes(key)) {
        event.preventDefault();
        postShortcutToParent({ keys: ["g", key] });
        resetGShortcutState();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "/") {
        event.preventDefault();
        postShortcutToParent({
          key: "/",
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      resetGShortcutState();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <ChatContext.Provider value={{ chatSessionId, tabSessionId }}>
      <ChatbotWithHooks tabSessionId={tabSessionId} chatSessionId={chatSessionId} />
    </ChatContext.Provider>
  )
}

export default React.memo(
  addUrlDataHoc(React.memo(ChatbotWrapper))
);