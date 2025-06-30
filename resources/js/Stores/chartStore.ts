import { create } from 'zustand';

// Define the types for your store's state
interface VehicleClass {
    id: number | string;
    name: string;
    color: string;
    key_name: string;
}

type ChartDataItem = {
    label: string;
    date_key: string;
    totalFleet: number;
    totalRented: number;
    totalStock: number;
    [key: string]: any;
};

interface ChartState {
    allHistoricalChartData: ChartDataItem[] | null;
    vehicleClasses: VehicleClass[];
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null; // Timestamp to check data freshness
    fetchChartData: () => Promise<void>; // Action to fetch data
}

// Safely access the global Ziggy route function
const getRoute = (name: string, params?: object) => {
    if (typeof window !== 'undefined' && typeof (window as any).route === 'function') {
        return (window as any).route(name, params);
    }
    console.error("Ziggy's route function is not globally available. Fallback URL generated.");
    return `/${name.replace(/\./g, '/')}`;
};

// Define the store
export const useChartStore = create<ChartState>((set, get) => ({
    allHistoricalChartData: null,
    vehicleClasses: [],
    isLoading: false,
    error: null,
    lastFetched: null,

    fetchChartData: async () => {
        const { isLoading, lastFetched } = get(); // Get current state
        const COLD_CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

        // Prevent multiple simultaneous fetches and use cached data if fresh enough
        if (isLoading) {
            console.log('Fetch already in progress, skipping.');
            return;
        }

        if (lastFetched && Date.now() - lastFetched < COLD_CACHE_DURATION) {
            console.log('Using cached chart data.');
            return; // Data is still fresh, no need to refetch
        }

        set({ isLoading: true, error: null }); // Set loading state

        try {
            const chartDataUrl = getRoute('rental-chart');

            const response = await fetch(chartDataUrl);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Raw error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText || '{}');
                    throw new Error(
                        `HTTP error! Status: ${response.status}. Message: ${errorData.error || errorData.message || 'Unknown error response.'}`,
                    );
                } catch (jsonParseError: any) {
                    throw new Error(
                        `HTTP error! Status: ${response.status}. Response was not valid JSON. Parse Error: ${jsonParseError.message}. Raw: ${errorText.substring(0, 200)}...`,
                    );
                }
            }

            const data = await response.json();

            set({
                allHistoricalChartData: data.chartData,
                vehicleClasses: data.vehicleClasses,
                lastFetched: Date.now(),
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            console.error('Error fetching chart data into store:', error);
            let errorMessage = error.message;
            if (errorMessage.includes('Ziggy') && errorMessage.includes('route function is not available')) {
                errorMessage =
                    'Error: Laravel Ziggy route function is not available. Please ensure Ziggy is correctly configured and routes are generated (php artisan ziggy:generate).';
            }
            set({
                error: errorMessage,
                isLoading: false,
            });
        }
    },
}));
