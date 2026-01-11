import { useReducer, useCallback } from "react";
// import { GPTConfig } from "@/lib/types";

type ModalState = {
  confirmDeleteGPT: {
    isOpen: boolean;
    gpt: { gptId: string; name: string } | null;
  };
  confirmDeletePDF: {
    isOpen: boolean;
    gptId: string;
    pdfName: string;
    openaiFileId: string;
  };
  error: {
    isOpen: boolean;
    title: string;
    message: string;
  };
  success: {
    isOpen: boolean;
    title: string;
    message: string;
  };
  confirmReset: {
    isOpen: boolean;
  };
  confirmSaveSettings: {
    isOpen: boolean;
  };
};

type ModalAction =
  | { type: "OPEN_CONFIRM_DELETE_GPT"; gpt: { gptId: string; name: string } }
  | { type: "CLOSE_CONFIRM_DELETE_GPT" }
  | {
      type: "OPEN_CONFIRM_DELETE_PDF";
      gptId: string;
      pdfName: string;
      openaiFileId: string;
    }
  | { type: "CLOSE_CONFIRM_DELETE_PDF" }
  | { type: "OPEN_ERROR"; title: string; message: string }
  | { type: "CLOSE_ERROR" }
  | { type: "OPEN_SUCCESS"; title: string; message: string }
  | { type: "CLOSE_SUCCESS" }
  | { type: "OPEN_CONFIRM_RESET" }
  | { type: "CLOSE_CONFIRM_RESET" }
  | { type: "OPEN_CONFIRM_SAVE_SETTINGS" }
  | { type: "CLOSE_CONFIRM_SAVE_SETTINGS" };

const initialState: ModalState = {
  confirmDeleteGPT: {
    isOpen: false,
    gpt: null
  },
  confirmDeletePDF: {
    isOpen: false,
    gptId: "",
    pdfName: "",
    openaiFileId: ""
  },
  error: {
    isOpen: false,
    title: "",
    message: ""
  },
  success: {
    isOpen: false,
    title: "",
    message: ""
  },
  confirmReset: {
    isOpen: false
  },
  confirmSaveSettings: {
    isOpen: false
  }
};

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN_CONFIRM_DELETE_GPT":
      return {
        ...state,
        confirmDeleteGPT: { isOpen: true, gpt: action.gpt }
      };
    case "CLOSE_CONFIRM_DELETE_GPT":
      return {
        ...state,
        confirmDeleteGPT: { isOpen: false, gpt: null }
      };
    case "OPEN_CONFIRM_DELETE_PDF":
      return {
        ...state,
        confirmDeletePDF: {
          isOpen: true,
          gptId: action.gptId,
          pdfName: action.pdfName,
          openaiFileId: action.openaiFileId
        }
      };
    case "CLOSE_CONFIRM_DELETE_PDF":
      return {
        ...state,
        confirmDeletePDF: {
          isOpen: false,
          gptId: "",
          pdfName: "",
          openaiFileId: ""
        }
      };
    case "OPEN_ERROR":
      return {
        ...state,
        error: { isOpen: true, title: action.title, message: action.message }
      };
    case "CLOSE_ERROR":
      return {
        ...state,
        error: { isOpen: false, title: "", message: "" }
      };
    case "OPEN_SUCCESS":
      return {
        ...state,
        success: { isOpen: true, title: action.title, message: action.message }
      };
    case "CLOSE_SUCCESS":
      return {
        ...state,
        success: { isOpen: false, title: "", message: "" }
      };
    case "OPEN_CONFIRM_RESET":
      return {
        ...state,
        confirmReset: { isOpen: true }
      };
    case "CLOSE_CONFIRM_RESET":
      return {
        ...state,
        confirmReset: { isOpen: false }
      };
    case "OPEN_CONFIRM_SAVE_SETTINGS":
      return {
        ...state,
        confirmSaveSettings: { isOpen: true }
      };
    case "CLOSE_CONFIRM_SAVE_SETTINGS":
      return {
        ...state,
        confirmSaveSettings: { isOpen: false }
      };
    default:
      return state;
  }
}

export function useAdminModals() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    // GPT deletion
    openConfirmDeleteGPT: useCallback(
      (gpt: { gptId: string; name: string }) =>
        dispatch({ type: "OPEN_CONFIRM_DELETE_GPT", gpt }),
      []
    ),
    closeConfirmDeleteGPT: useCallback(
      () => dispatch({ type: "CLOSE_CONFIRM_DELETE_GPT" }),
      []
    ),

    // PDF deletion
    openConfirmDeletePDF: useCallback(
      (gptId: string, pdfName: string, openaiFileId: string) =>
        dispatch({
          type: "OPEN_CONFIRM_DELETE_PDF",
          gptId,
          pdfName,
          openaiFileId
        }),
      []
    ),
    closeConfirmDeletePDF: useCallback(
      () => dispatch({ type: "CLOSE_CONFIRM_DELETE_PDF" }),
      []
    ),

    // Error modal
    openError: useCallback(
      (title: string, message: string) =>
        dispatch({ type: "OPEN_ERROR", title, message }),
      []
    ),
    closeError: useCallback(() => dispatch({ type: "CLOSE_ERROR" }), []),

    // Success modal
    openSuccess: useCallback(
      (title: string, message: string) =>
        dispatch({ type: "OPEN_SUCCESS", title, message }),
      []
    ),
    closeSuccess: useCallback(() => dispatch({ type: "CLOSE_SUCCESS" }), []),

    // Form reset confirmation
    openConfirmReset: useCallback(
      () => dispatch({ type: "OPEN_CONFIRM_RESET" }),
      []
    ),
    closeConfirmReset: useCallback(
      () => dispatch({ type: "CLOSE_CONFIRM_RESET" }),
      []
    ),

    // Save settings confirmation
    openConfirmSaveSettings: useCallback(
      () => dispatch({ type: "OPEN_CONFIRM_SAVE_SETTINGS" }),
      []
    ),
    closeConfirmSaveSettings: useCallback(
      () => dispatch({ type: "CLOSE_CONFIRM_SAVE_SETTINGS" }),
      []
    )
  };

  return {
    state,
    actions
  };
}
