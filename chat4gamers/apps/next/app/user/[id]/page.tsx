import {UserDetailScreen} from 'app/features/user/detail-screen'

// This is the magic spell for static exports:
export const dynamicParams = false

export function generateStaticParams() {
    // We return a "dummy" ID so the compiler has 1 file to create
    // and stops complaining that it's "missing" params.
    return [{id: 'preview'}]
}

export default function Page(_props: { params: Promise<{ id: string }> }) {
    // In a static export, we don't need to 'await' this during build
    // because we're just rendering the shell.
    return <UserDetailScreen id="preview"/>
}
