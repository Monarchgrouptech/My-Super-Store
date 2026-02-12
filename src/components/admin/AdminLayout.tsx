interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Main Content */}
            <main className="flex-1 w-full">
                <div className="flex justify-center w-full">
                    <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-10 py-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
