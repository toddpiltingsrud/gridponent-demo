<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title jx-panel="page-title">&lt;/grid-ponent&gt;</title>
    <script src="scripts/polyfills.js"></script>
    <script src="scripts/jquery-2.2.0.min.js"></script>
    <script src="scripts/lojax.js"></script>
    <script src="scripts/moment.min.js"></script>
    <script src="scripts/numeral.min.js"></script>
    <script src="scripts/gridponent.js"></script>
    <link href="styles/bootstrap.min.css" rel="stylesheet">
    <link href="styles/Site.css" rel="stylesheet">
    <link href="styles/shCore.css" rel="stylesheet">
    <link href="styles/shCoreDefault.css" rel="stylesheet">
    <link href="styles/gridponent.min.css" rel="stylesheet">
</head>
<body>
    <div class="navbar navbar-inverse navbar-fixed-top">
        <div class="navbar-header">
            <button type="button" class="navbar-toggle" style="display:inline-block;">
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
            <a href="index.php" class="navbar-brand" jx-panel="navbar-brand">&lt;/grid-ponent&gt;</a>
        </div>
    </div>

    <?php include('partials/menu.php')?>

    <div class="container body-content" jx-panel="content-body">
        <?php if(isset($TPL->ContentBody)) { echo $TPL->ContentBody; } ?>
    </div>

    <footer class="footer" jx-panel="content-footer">
        <?php if(isset($TPL->ContentFooter)) { echo $TPL->ContentFooter; } ?>
        <?php include('partials/progress.html') ?>
    </footer>

    <div id="background"></div>

    <script>
        $(function () {
            var requestCount = 0;

            $(document).on("beforeRequest", function () {
                requestCount++;
                $('.footer').addClass('show');
                $('.progress').fadeIn();
            });

            $(document).on("afterRequest", function () {
                requestCount--;
                if (requestCount <= 0) {
                    requestCount == 0;
                    $('.progress').fadeOut();
                    $('.footer').removeClass('show');
                }
            });

            if (!document.registerElement) {
                $(document).on(lojax.events.afterInject, function (evt, context) {
                    gridponent.initialize(context);
                });
            }
        });

    </script>

    <script src="scripts/bootstrap.min.js"></script>
    <script src="data/products.js"></script>
    <script src="scripts/json2xml.js"></script>

    <div style="display: none" jx-panel="scripts"></div>

</body>
</html>
