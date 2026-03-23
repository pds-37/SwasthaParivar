/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { useMembers } from "../hooks/useMembers";

const FamilyStoreContext = createContext(null);

const defaultFamilyStore = {
  members: [],
  selectedMember: null,
  loading: false,
  error: null,
  refreshMembers: () => {},
  createMember: async () => null,
  deleteMember: async () => null,
  setSelectedMember: () => {},
};

const familyReducer = (state, action) => {
  switch (action.type) {
    case "SET_MEMBERS":
      return {
        ...state,
        members: action.payload,
        selectedMember:
          state.selectedMember && action.payload.some((member) => member._id === state.selectedMember._id)
            ? action.payload.find((member) => member._id === state.selectedMember._id)
            : state.selectedMember,
      };
    case "SET_SELECTED_MEMBER":
      return {
        ...state,
        selectedMember: action.payload,
      };
    default:
      return state;
  }
};

export const FamilyStoreProvider = ({ children }) => {
  const { members, loading, error, mutate, createMember, deleteMember } = useMembers();
  const [state, dispatch] = useReducer(familyReducer, {
    members: [],
    selectedMember: null,
  });

  useEffect(() => {
    dispatch({ type: "SET_MEMBERS", payload: members });
  }, [members]);

  const value = useMemo(
    () => ({
      members: state.members,
      selectedMember: state.selectedMember,
      loading,
      error,
      refreshMembers: mutate,
      createMember,
      deleteMember,
      setSelectedMember: (member) => dispatch({ type: "SET_SELECTED_MEMBER", payload: member }),
    }),
    [createMember, deleteMember, error, loading, mutate, state.members, state.selectedMember]
  );

  return <FamilyStoreContext.Provider value={value}>{children}</FamilyStoreContext.Provider>;
};

export const useFamilyStore = () => {
  const context = useContext(FamilyStoreContext);
  return context || defaultFamilyStore;
};
