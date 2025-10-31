import React from 'react';

// --- UI Component Imports (shadcn/ui) ---
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// --- Type Imports ---
// Ensure Vehicle type includes the fields used (e.g., purchase_price, daily_rental_price, etc.)
import { Vehicle } from '@/types'; // Adjust path if needed

// --- Helper Imports ---
import { format, isValid } from 'date-fns'; // For formatting dates

// --- Props Interface ---
interface ShowProps {
    selectedVehicle: Vehicle | null;
}

// --- Helper Type for Relation Objects ---
// Define a type for objects that might have a 'name' property
type RelationObject = { name: string; [key: string]: any } | null | undefined;

// --- Show Component ---
export const Show: React.FC<ShowProps> = ({ selectedVehicle }) => {
    // Handle the case where no vehicle is selected
    if (!selectedVehicle) {
        return <div className="text-muted-foreground p-4 text-center">No vehicle details to display.</div>;
    }

    // Helper function to format dates safely
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (!isValid(date)) {
                return dateString; // Return original string if invalid
            }
            return format(date, 'PPP'); // Example format: Jan 1st, 2024
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    };

    // Helper function to format numbers as USD currency
    const formatCurrency = (value: string | number | undefined | null): string => {
        if (value === null || value === undefined || value === '') return 'N/A';

        const numericValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numericValue)) {
            // console.warn(`Invalid number for currency formatting: ${value}`);
            return String(value); // Return original value if it's not a valid number
        }

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2, // Ensure two decimal places
                maximumFractionDigits: 2,
            }).format(numericValue);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return String(value); // Return original value on error
        }
    };

    // Helper function to safely render relation objects (like maker, model, class, status, user)
    const renderRelation = (relation: RelationObject | string): string => {
        if (typeof relation === 'object' && relation !== null && 'name' in relation) {
            return relation.name ?? 'N/A';
        }
        if (typeof relation === 'string') {
            return relation;
        }
        return 'N/A';
    };

    // Helper function to render a standard detail item
    const renderDetailItem = (label: string, value: string | number | undefined | null) => (
        <div className="grid grid-cols-3 items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground col-span-1 font-medium">{label}:</span>
            <span className="col-span-2">{value ?? 'N/A'}</span>
        </div>
    );

    // Helper function to render a detail item formatted as currency
    const renderCurrencyItem = (label: string, value: string | number | undefined | null) => (
        <div className="grid grid-cols-3 items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground col-span-1 font-medium">{label}:</span>
            <span className="col-span-2">{formatCurrency(value)}</span> {/* Use formatCurrency */}
        </div>
    );

    // Helper function to render a detail item with a Badge for status
    const renderStatusItem = (label: string, value: RelationObject | string) => (
        <div className="grid grid-cols-3 items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground col-span-1 font-medium">{label}:</span>
            <div className="col-span-2">
                <Badge variant="outline">{renderRelation(value)}</Badge>
            </div>
        </div>
    );

    // Helper function to render the photo
    const renderPhotoItem = (imageUrl: string | null | undefined) => {
        if (!imageUrl) {
            return (
                <div className="bg-sidebar flex aspect-video h-auto max-h-64 w-full items-center justify-center rounded-lg border">
                    <p>No image available.</p>
                </div>
            );
        }
        return (
            <div>
                <img src={imageUrl} alt="Vehicle Photo" className="h-auto max-h-64 w-full rounded-lg border object-cover" />
            </div>
        );
    };

    return (
        <div className="space-y-4 px-1 md:px-4">
            {/* --- Basic Vehicle Information Card --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <CardDescription className="text-xs">Core details of the vehicle.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {renderPhotoItem(selectedVehicle.photo_path)}
                    {renderDetailItem('Vehicle No', selectedVehicle.vehicle_no)}
                    {/* Assuming 'current_status_name' holds the status string */}
                    {renderStatusItem('Status', selectedVehicle.current_status_name)}
                    {renderDetailItem('Plate No', selectedVehicle.license_plate)}
                    {/* Assuming 'make' and 'model' can be relation objects or strings */}
                    {renderDetailItem('Maker', renderRelation(selectedVehicle.make))}
                    {renderDetailItem('Model', renderRelation(selectedVehicle.model))}
                    {/* Assuming 'vehicle_class_name' holds the class string */}
                    {renderDetailItem('Class', renderRelation(selectedVehicle.vehicle_class_name))}
                    {renderDetailItem('Year Made', selectedVehicle.year)}
                    {renderDetailItem('Color', selectedVehicle.color)}
                    {renderDetailItem('VIN', selectedVehicle.vin)}
                    {renderDetailItem('Engine CC', selectedVehicle.engine_cc)}
                </CardContent>
            </Card>

            {/* --- Purchase & Pricing --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Purchase & Pricing</CardTitle>
                    <CardDescription className="text-xs">Details about acquisition and rental costs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {renderDetailItem('Purchase Date', formatDate(selectedVehicle.purchase_date))}
                    {/* Use renderCurrencyItem for pricing fields */}
                    {renderCurrencyItem('Purchase Price', selectedVehicle.purchase_price)}
                    {renderCurrencyItem('Compensation Price', selectedVehicle.compensation_price)}
                    {renderCurrencyItem('Daily Price', selectedVehicle.daily_rental_price)}
                    {renderCurrencyItem('Weekly Price', selectedVehicle.weekly_rental_price)}
                    {renderCurrencyItem('Monthly Price', selectedVehicle.monthly_rental_price)}
                </CardContent>
            </Card>

            {/* --- Additional Information Card --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                    <CardDescription className="text-xs">Input details and notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {/* Assuming 'user_name' holds the inputer's name string */}
                    {renderDetailItem('Inputer', renderRelation(selectedVehicle.user_name))}
                    {/* Notes Section */}
                    <div className="grid grid-cols-3 items-start gap-x-2 gap-y-1 pt-1 text-sm">
                        <span className="text-muted-foreground col-span-1 font-medium">Notes:</span>
                        <p className="col-span-2 whitespace-pre-wrap">{selectedVehicle.notes || 'N/A'}</p>
                    </div>
                    {renderDetailItem('Created At', formatDate(selectedVehicle.created_at))}
                    {renderDetailItem('Last Updated', formatDate(selectedVehicle.updated_at))}
                </CardContent>
            </Card>
        </div>
    );
};

// Export the component for use in other files
export default Show;
