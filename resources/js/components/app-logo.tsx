import Logo from '../assets/logo.png';

export default function AppLogo() {
    return (
        <>
            <div className="flex size-8 items-center justify-center">
                <img src={Logo} alt="logo" className="size-6 h-auto w-full" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-bold">EMC</span>
            </div>
        </>
    );
}
