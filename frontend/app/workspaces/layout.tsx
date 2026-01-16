export default function WorkspacesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dark min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            {children}
        </div>
    );
}
