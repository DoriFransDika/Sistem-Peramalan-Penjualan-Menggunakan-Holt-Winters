<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <script>
        (function () {
            window.FASTAPI_URL = "{{ env('VITE_FASTAPI_URL', 'http://127.0.0.1:8001') }}";
            try {
                var v = localStorage.getItem('theme');
                if (v === 'light') document.documentElement.classList.remove('dark');
                else document.documentElement.classList.add('dark');
            } catch (e) {
                document.documentElement.classList.add('dark');
            }
        })();
    </script>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
