import { useReducer, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";

type ProjectId = Id<"projects">;

type ProjectRef = {
  id: ProjectId;
  name: string;
};

/* -------------------- State -------------------- */

type ModalState = {
  newProject: {
    isOpen: boolean;
    name: string;
  };
  deleteProject: {
    isOpen: boolean;
    project: ProjectRef | null;
  };
  renameProject: {
    isOpen: boolean;
    project: ProjectRef | null;
    name: string;
  };
};

/* -------------------- Actions -------------------- */

type ModalAction =
  | { type: "OPEN_NEW_PROJECT" }
  | { type: "CLOSE_NEW_PROJECT" }
  | { type: "SET_NEW_PROJECT_NAME"; name: string }
  | { type: "OPEN_DELETE_PROJECT"; project: ProjectRef }
  | { type: "CLOSE_DELETE_PROJECT" }
  | { type: "OPEN_RENAME_PROJECT"; project: ProjectRef }
  | { type: "SET_RENAME_PROJECT_NAME"; name: string }
  | { type: "CLOSE_RENAME_PROJECT" };

/* -------------------- Reducer -------------------- */

const initialState: ModalState = {
  newProject: { isOpen: false, name: "" },
  deleteProject: { isOpen: false, project: null },
  renameProject: { isOpen: false, project: null, name: "" }
};

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN_NEW_PROJECT":
      return { ...state, newProject: { isOpen: true, name: "" } };

    case "CLOSE_NEW_PROJECT":
      return { ...state, newProject: { isOpen: false, name: "" } };

    case "SET_NEW_PROJECT_NAME":
      return {
        ...state,
        newProject: { ...state.newProject, name: action.name }
      };

    case "OPEN_DELETE_PROJECT":
      return {
        ...state,
        deleteProject: { isOpen: true, project: action.project }
      };

    case "CLOSE_DELETE_PROJECT":
      return {
        ...state,
        deleteProject: { isOpen: false, project: null }
      };

    case "OPEN_RENAME_PROJECT":
      return {
        ...state,
        renameProject: {
          isOpen: true,
          project: action.project,
          name: action.project.name
        }
      };

    case "SET_RENAME_PROJECT_NAME":
      return {
        ...state,
        renameProject: {
          ...state.renameProject,
          name: action.name
        }
      };

    case "CLOSE_RENAME_PROJECT":
      return {
        ...state,
        renameProject: { isOpen: false, project: null, name: "" }
      };

    default:
      return state;
  }
}

/* -------------------- Hook -------------------- */

export function useProjectModals() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    /* New project */
    openNewProject: useCallback(
      () => dispatch({ type: "OPEN_NEW_PROJECT" }),
      []
    ),
    closeNewProject: useCallback(
      () => dispatch({ type: "CLOSE_NEW_PROJECT" }),
      []
    ),
    setNewProjectName: useCallback(
      (name: string) => dispatch({ type: "SET_NEW_PROJECT_NAME", name }),
      []
    ),

    /* Delete project */
    openDeleteProject: useCallback(
      (project: ProjectRef) =>
        dispatch({ type: "OPEN_DELETE_PROJECT", project }),
      []
    ),
    closeDeleteProject: useCallback(
      () => dispatch({ type: "CLOSE_DELETE_PROJECT" }),
      []
    ),

    /* Rename project */
    openRenameProject: useCallback(
      (project: ProjectRef) =>
        dispatch({ type: "OPEN_RENAME_PROJECT", project }),
      []
    ),
    setRenameProjectName: useCallback(
      (name: string) => dispatch({ type: "SET_RENAME_PROJECT_NAME", name }),
      []
    ),
    closeRenameProject: useCallback(
      () => dispatch({ type: "CLOSE_RENAME_PROJECT" }),
      []
    )
  };

  return {
    state,
    actions
  };
}
