<?php include "../partials/nocache.php"; ?>
<div jx-panel="content-body">

    <h3>
        <code>
            &lt;/products&gt;
        </code>
    </h3>

    <div class="panel-background">
        <div class="border" style="margin-bottom: 20px">
            <grid-ponent 
                fixed-headers
                responsive="true"
                sorting 
                onrowselect="#pages/product-detail.php?id={{ProductID}}"
                read="data.products"
                update="fns.updateRow"
                delete="fns.deleteRow"
                pager="bottom-left"
                search="top-left">
                <gp-column field="ProductNumber" header="Product #"></gp-column>
                <gp-column sort="StandardCost" header="Cost %">
                    <script data-template="body" type="text/html">
                        <div class="bar-outer">
                            <div class="bar-inner" style="width:{{fns.getWidthPercent}}%"></div>
                        </div>
                    </script>
                </gp-column>
                <gp-column field="MakeFlag" header="Make" width="75px" header-class="hidden-sm hidden-xs" body-class="hidden-sm hidden-xs"></gp-column>
                <gp-column field="SafetyStockLevel" header="Safety Stock Level" header-class="hidden-xs" body-class="hidden-xs">
                    <script type="text/html" data-template="body">
                        <button class="btn btn-default btn-xs" style="min-width:60px" value="fns.filterByStockLevel"><span class="glyphicon glyphicon-search"></span>{{SafetyStockLevel}}</button>
                    </script>
                </gp-column>
                <gp-column field="StandardCost" header="Standard Cost" format="$0,0"></gp-column>
                <gp-column field="SellStartDate" header="Sell Start Date" format="D MMMM, YYYY"></gp-column>
                <gp-column commands="Edit,Delete"></gp-column>
            </grid-ponent>
        </div>


        <script>
            var fns = fns || {};
            fns.updateRow = function (row, callback) {
                callback({ Row: row });
            };

            fns.getWidthPercent = function (row) {
                return row.StandardCost > 300 ? 100 : row.StandardCost == null ? 0 : row.StandardCost / 300 * 100;
            };

            fns.deleteRow = function (row, callback) {
                var index = data.products.indexOf(row);
                if (index != -1) {
                    data.products.splice(index, 1);
                }
                callback(index != -1);
            };

            fns.filterByStockLevel = function (row, tr) {
                this.search(row.SafetyStockLevel);
            }
        </script>

    </div>
</div>