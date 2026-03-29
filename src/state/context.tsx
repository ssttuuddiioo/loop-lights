import { createContext } from 'preact';
import { useContext, useReducer } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { appReducer, initialState } from './reducer';
import type { AppState } from './reducer';
import type { AppAction } from './actions';

const StateContext = createContext<AppState>(initialState);
const DispatchContext = createContext<(action: AppAction) => void>(() => {});

export function AppProvider({ children }: { children: ComponentChildren }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  return useContext(StateContext);
}

export function useAppDispatch(): (action: AppAction) => void {
  return useContext(DispatchContext);
}
