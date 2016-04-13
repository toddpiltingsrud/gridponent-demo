<div class="nav-container">
    <div class="relative-container">
        <ul class="leftnav navbar-nav">
            <li>
                <a href="#pages/home.php" class="active">
                    <span class="glyphicon glyphicon-home"></span>Home
                </a>
            </li>
            <li>
                <a href="#pages/grid.php">
                    <span class="glyphicon glyphicon-list"></span>Demo
                </a>
            </li>
            <li>
                <a href="#pages/builder.php">
                    <span class="glyphicon glyphicon-wrench"></span>Builder
                </a>
            </li>
        </ul>
    </div>
</div>

<script>
    $(function () {
        $(document).click(function () {
            $('.nav-container').addClass('collapse');
        });
        $('.navbar-toggle').click(function (evt) {
            $('.nav-container').toggleClass('collapse');
            evt.stopPropagation();
        });
        $('ul.leftnav > li > a').click(function (evt) {
            $('ul.leftnav a').removeClass('active');
            $(this).addClass('active');
            setTimeout(function () {
                $('.nav-container').addClass('collapse');
            }, 250);
            evt.stopPropagation();
        });
        $('ul.leftnav > li > ul a').click(function () {
            $('.nav-container').addClass('collapse');
        });
        $('ul.leftnav').change(function () {
            $('.nav-container').addClass('collapse');
        });

        setTimeout(function () {
            $('.nav-container').addClass('collapse');
        }, 500);

        lojax.emptyHashAction = 'index.php';
        lojax.config.transition = 'empty-append-children';

        if (!lojax.priv.hasHash()) {
            lojax.exec({
                action: 'pages/home.php',
                method: 'ajax-get'
            });
        }
    });
</script>
