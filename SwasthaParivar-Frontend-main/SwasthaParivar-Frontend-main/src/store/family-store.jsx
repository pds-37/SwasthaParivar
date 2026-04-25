/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { useHousehold } from "../hooks/useHousehold";
import { useMembers } from "../hooks/useMembers";

const FamilyStoreContext = createContext(null);

const defaultFamilyStore = {
  members: [],
  household: null,
  selfMember: null,
  memberships: [],
  pendingInvites: [],
  selectedMember: null,
  activeView: "family",
  loading: false,
  error: null,
  refreshMembers: () => {},
  createMember: async () => null,
  deleteMember: async () => null,
  createInvite: async () => null,
  acceptInvite: async () => null,
  setSelectedMember: () => {},
  setActiveView: () => {},
};

const getInitialActiveView = () => {
  if (typeof window === "undefined") return "family";

  const savedView = window.localStorage.getItem("sp_active_view");
  return savedView === "self" ? "self" : "family";
};

const familyReducer = (state, action) => {
  switch (action.type) {
    case "SET_MEMBERS":
      return {
        ...state,
        members: action.payload,
        selfMember:
          state.selfMember && action.payload.some((member) => member._id === state.selfMember._id)
            ? action.payload.find((member) => member._id === state.selfMember._id)
            : state.selfMember,
        selectedMember:
          state.selectedMember && action.payload.some((member) => member._id === state.selectedMember._id)
            ? action.payload.find((member) => member._id === state.selectedMember._id)
            : null,
      };
    case "SET_HOUSEHOLD":
      return {
        ...state,
        household: action.payload.household,
        selfMember: action.payload.selfMember,
        memberships: action.payload.memberships,
        pendingInvites: action.payload.pendingInvites,
        selectedMember:
          state.activeView === "self"
            ? action.payload.selfMember || null
            : state.selectedMember,
        activeView:
          state.activeView === "self" && !action.payload.selfMember
            ? "family"
            : state.activeView,
      };
    case "SET_SELECTED_MEMBER":
      return {
        ...state,
        selectedMember: action.payload,
      };
    case "SET_ACTIVE_VIEW":
      return {
        ...state,
        activeView: action.payload.view === "self" ? "self" : "family",
        selectedMember:
          action.payload.view === "self"
            ? action.payload.selfMember || state.selfMember || null
            : action.payload.selectedMember ?? null,
      };
    default:
      return state;
  }
};

export const FamilyStoreProvider = ({ children }) => {
  const { members, loading, error, mutate, createMember, deleteMember } = useMembers();
  const {
    household,
    selfMember,
    memberships,
    pendingInvites,
    loading: householdLoading,
    error: householdError,
    mutate: mutateHousehold,
    createInvite,
    acceptInvite,
  } = useHousehold();
  const [state, dispatch] = useReducer(familyReducer, {
    members: [],
    household: null,
    selfMember: null,
    memberships: [],
    pendingInvites: [],
    selectedMember: null,
    activeView: getInitialActiveView(),
  });

  useEffect(() => {
    dispatch({ type: "SET_MEMBERS", payload: members });
  }, [members]);

  useEffect(() => {
    dispatch({
      type: "SET_HOUSEHOLD",
      payload: {
        household,
        selfMember,
        memberships,
        pendingInvites,
      },
    });
  }, [household, memberships, pendingInvites, selfMember]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sp_active_view", state.activeView);
  }, [state.activeView]);

  const value = useMemo(
    () => ({
      members: state.members,
      household: state.household,
      selfMember: state.selfMember,
      memberships: state.memberships,
      pendingInvites: state.pendingInvites,
      selectedMember: state.selectedMember,
      activeView: state.activeView,
      loading: loading || householdLoading,
      error: error || householdError,
      refreshMembers: async () => {
        await Promise.allSettled([mutate?.(), mutateHousehold?.()]);
      },
      createMember: async (payload) => {
        const created = await createMember(payload);
        await mutateHousehold?.();
        return created;
      },
      deleteMember: async (memberId) => {
        await deleteMember(memberId);
        await mutateHousehold?.();
      },
      createInvite: async (payload) => {
        const invite = await createInvite(payload);
        await mutateHousehold?.();
        return invite;
      },
      acceptInvite: async (code) => {
        const accepted = await acceptInvite(code);
        await Promise.all([mutate?.(), mutateHousehold?.()]);
        return accepted;
      },
      setSelectedMember: (member) => dispatch({ type: "SET_SELECTED_MEMBER", payload: member }),
      setActiveView: (view, payload = {}) =>
        dispatch({
          type: "SET_ACTIVE_VIEW",
          payload: {
            view,
            selfMember: payload.selfMember || state.selfMember,
            selectedMember: payload.selectedMember ?? null,
          },
        }),
    }),
    [
      acceptInvite,
      createInvite,
      createMember,
      deleteMember,
      error,
      householdError,
      householdLoading,
      loading,
      mutate,
      mutateHousehold,
      state.activeView,
      state.household,
      state.members,
      state.memberships,
      state.pendingInvites,
      state.selectedMember,
      state.selfMember,
    ]
  );

  return <FamilyStoreContext.Provider value={value}>{children}</FamilyStoreContext.Provider>;
};

export const useFamilyStore = () => {
  const context = useContext(FamilyStoreContext);
  return context || defaultFamilyStore;
};
