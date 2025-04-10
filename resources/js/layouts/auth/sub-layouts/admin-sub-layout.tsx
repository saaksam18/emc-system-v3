import Heading from '@/components/heading'; // Assuming this component exists
import { Button } from '@/components/ui/button'; // Assuming this component exists
import { Separator } from '@/components/ui/separator'; // Assuming this component exists
import { cn } from '@/lib/utils'; // Assuming this utility function exists
import { type NavItem } from '@/types'; // Assuming this type definition exists
import { Link } from '@inertiajs/react'; // Assuming Inertia.js Link component
import { ReactNode, useEffect, useState } from 'react'; // Import useEffect and useState

interface subLayoutProps {
    sidebarNavItems: NavItem[];
    title: string;
    description: string;
    children?: ReactNode | undefined;
}

export default function SubLayout({ sidebarNavItems, title, description, children }: subLayoutProps) {
    // State to hold the current path, initialized to null
    const [currentPath, setCurrentPath] = useState<string | null>(null);

    // Effect to set the current path only on the client-side after mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentPath(window.location.pathname);
        }
    }, []); // Empty dependency array ensures this runs only once after mount

    // If currentPath is still null (e.g., during initial server render or before effect runs),
    // return null or a loading indicator. Returning null avoids rendering mismatch.
    if (currentPath === null) {
        return null;
    }

    return (
        <div className="px-4 py-6">
            {/* Heading component to display title and description */}
            <Heading title={title} description={description} />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                {/* Sidebar Navigation */}
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`} // Unique key for each button
                                size="sm"
                                variant="ghost"
                                asChild // Renders the Link component as the button's child
                                className={cn(
                                    'w-full justify-start', // Base classes
                                    {
                                        // Conditional class: apply 'bg-muted' if currentPath starts with item.href
                                        'bg-muted': currentPath.startsWith(item.href),
                                    },
                                )}
                            >
                                {/* Inertia Link component for navigation */}
                                <Link href={item.href} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                {/* Separator for mobile/tablet view */}
                <Separator className="my-6 md:hidden" />

                {/* Main content area */}
                <div className="w-full flex-1">
                    <section className="space-y-4">{children}</section>
                </div>
            </div>
        </div>
    );
}

// --- Mock/Placeholder Components (if needed for testing/running) ---
// You would replace these with your actual component implementations

// Mock Heading component
const MockHeading = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

// Mock Button component (basic styling)
const MockButton = ({ className, children, asChild, ...props }: any) => {
    const Comp = asChild ? 'span' : 'button'; // Render span if asChild, else button
    return (
        <Comp className={cn('rounded-md px-3 py-1.5 text-sm hover:bg-gray-100', className)} {...props}>
            {children}
        </Comp>
    );
};

// Mock Separator component
const MockSeparator = ({ className }: { className?: string }) => <hr className={cn('border-t', className)} />;

// Mock cn utility (basic version)
const mockCn = (...inputs: any[]) => {
    return inputs
        .flat()
        .filter((x) => typeof x === 'string' || typeof x === 'object')
        .map((x) =>
            typeof x === 'string'
                ? x
                : Object.keys(x)
                      .filter((key) => x[key])
                      .join(' '),
        )
        .join(' ');
};
