// src/store/useChartStore.ts
import { create } from 'zustand';

export interface ChartDataItem {
    id: number;
    label: string;
    total: number;
    available: number;
    unavailable: number;
    vehicle_class_key: string;
    fill: string;
}

export interface ChartStoreState {
    fetchedChartData: ChartDataItem[];
    vehicleClassIdToKeyName: { [key: number]: string };
    activeClassKey: string | null;
    loading: boolean;
    error: Error | null;
    grandTotalAvailableVehicles: number;

    fetchChartData: () => Promise<void>;
    setActiveClassKey: (key: string | null) => void;
}

export const vehicleStockChartStore = create<ChartStoreState>((set) => ({
    fetchedChartData: [],
    vehicleClassIdToKeyName: {},
    activeClassKey: null,
    loading: false,
    error: null,
    grandTotalAvailableVehicles: 0,

    setActiveClassKey: (key: string | null) => set({ activeClassKey: key }),

    fetchChartData: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch('vehicle-stock-chart');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const apiData: {
                chartData: ChartDataItem[];
                vehicleClassIdToKeyName: { [key: number]: string };
                grandTotalAvailableVehicles: number;
            } = await response.json();

            let initialActiveClassKey: string | null = null;
            if (apiData.chartData.length > 0) {
                // Find the item with the maximum 'total' count
                const maxTotalItem = apiData.chartData.reduce((prev, current) => {
                    return prev.total > current.total ? prev : current;
                });
                initialActiveClassKey = maxTotalItem.vehicle_class_key;
            }

            set({
                fetchedChartData: apiData.chartData,
                vehicleClassIdToKeyName: apiData.vehicleClassIdToKeyName,
                grandTotalAvailableVehicles: apiData.grandTotalAvailableVehicles,
                activeClassKey: initialActiveClassKey, // <--- SET THE ACTIVE KEY TO THE ONE WITH BIGGEST COUNT
                loading: false,
            });
        } catch (err: any) {
            console.error('Failed to fetch vehicle stock data:', err);
            set({ error: err, loading: false });
        }
    },
}));
