<?php

    #FormTable.php
    include_once('../partials/nocache.php');
    require_once('../lib/BootstrapModal.php');
    # trick to execute 1st time, but not 2nd so you don't have an inf loop

    if (!isset($TPL)) {

        $TPL = new BootstrapModal();

        ob_start();
        include "product-detail.php";
        $TPL->Body = ob_get_contents();
        ob_end_clean();

        $TPL->Header = "Product Detail";
        require "../layouts/BootstrapModal.php";
        exit;
    }

?>

<div id="product-detail">
    <table class="table"></table>
</div>
<script>
    lojax.in(function(){
        var self = this;
        var row = data.products.filter(function(row){
            return row.ProductID == <?php echo $_GET["id"]; ?>;
        })[0];

        var props = Object.getOwnPropertyNames(row);

        props.forEach(function(prop){
            if (row[prop] != null) {
            $(self).find('table.table').append('<tr>')
                .append('<th>' + prop + '</th>')
                .append('<td>' + row[prop] + '</td>')
                .append('</tr>');
            }
        });
    });
</script>