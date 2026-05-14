import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

const STORAGE_KEY = 'kg_selected_location';

interface SelectedLocation {
  id: number;
  name: string;
}

interface LocationState {
  selectedLocation: SelectedLocation | null;
}

function loadFromStorage(): SelectedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectedLocation) : null;
  } catch {
    return null;
  }
}

const locationSlice = createSlice({
  name: 'location',
  initialState: (): LocationState => ({
    selectedLocation: loadFromStorage(),
  }),
  reducers: {
    setSelectedLocation(state, action: PayloadAction<SelectedLocation>) {
      state.selectedLocation = action.payload;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
    },
    clearSelectedLocation(state) {
      state.selectedLocation = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { setSelectedLocation, clearSelectedLocation } = locationSlice.actions;

export const selectSelectedLocation = (state: RootState) =>
  state.location.selectedLocation;

export default locationSlice.reducer;
