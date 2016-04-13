<?php include "../partials/nocache.php"; ?>
<div jx-panel="content-body">

    <h3>
        <code>
            &lt;/grid-builder&gt;
        </code>
    </h3>

    <div class="panel-background">

        <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active"><a href="#options" aria-controls="home" role="tab" data-toggle="tab">Options</a></li>
            <li role="presentation"><a href="#columns" aria-controls="profile" role="tab" data-toggle="tab">Columns</a></li>
            <li role="presentation"><a href="#json" aria-controls="messages" role="tab" data-toggle="tab">JSON</a></li>
            <li role="presentation"><a href="#html" aria-controls="settings" role="tab" data-toggle="tab">HTML</a></li>
        </ul>

        <div class="tab-content">
        

            <div class="tab-pane active row" id="options">
                <div class="col-md-4">
                    <div>

                        <div class="panel panel-primary">
                            <div class="panel-heading">
                                data access
                            </div>
                            <div class="panel-body">
                                <div class="form-group">
                                    <label>
                                        read
                                        <input type="text" name="read" class="form-control" />
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label>
                                        create
                                        <input type="text" name="create" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        update
                                        <input type="text" name="update" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        destroy
                                        <input type="text" name="destroy" class="form-control" />
                                    </label>
                                </div>
                              <div class="form-group">
                                <label>
                                  model
                                  <input type="text" name="model" class="form-control" />
                                </label>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div class="col-md-4">
                    <div>

                        <div class="panel panel-primary">
                            <div class="panel-heading">
                                layout
                            </div>
                            <div class="panel-body">
                                <div class="form-group">
                                    <label>
                                        fixed-headers
                                        <input type="checkbox" name="fixed-headers" class="form-control" value="true" />
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label>
                                        fixed-footers
                                        <input type="checkbox" name="fixed-footers" class="form-control" value="true" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        responsive
                                        <input type="checkbox" name="responsive" class="form-control" value="true" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        sorting
                                        <input type="checkbox" name="sorting" class="form-control" value="true" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        search-box
                                        <select name="search-box" class="form-control">
                                            <option value="">Select...</option>
                                            <option value="top-right">top-right</option>
                                            <option value="top-left">top-left</option>
                                            <option value="bottom-right">bottom-right</option>
                                            <option value="bottom-left">bottom-left</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        pager
                                        <select name="pager" class="form-control">
                                            <option value="">Select...</option>
                                            <option value="top-right">top-right</option>
                                            <option value="top-left">top-left</option>
                                            <option value="bottom-right">bottom-right</option>
                                            <option value="bottom-left">bottom-left</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        toolbar-template
                                        <input type="text" name="toolbar-template" class="form-control" value="&lt;div class=&quot;toolbar&quot;&gt;&lt;/div&gt;" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        edit-mode
                                    </label>
                                    <label style="display: inline-block; width:  auto;margin-right: 10px">
                                        <input type="radio" name="edit-mode" value="inline" class="form-control" />
                                        inline
                                    </label>
                                    <label style="display: inline-block;width: auto;">
                                        <input type="radio" name="edit-mode" value="modal" class="form-control" />
                                        modal
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div>

                        <div class="panel panel-primary">
                            <div class="panel-heading">
                                events
                            </div>
                            <div class="panel-body">
                                <div class="form-group">
                                    <label>
                                        ready
                                        <input type="text" name="ready" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        rowselected
                                        <input type="text" name="rowselected" class="form-control" />
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label>
                                        beforeinit
                                        <input type="text" name="beforeinit" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        beforeread
                                        <input type="text" name="beforeread" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        onread
                                        <input type="text" name="onread" class="form-control">
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        onedit
                                        <input type="text" name="onedit" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        editmode
                                        <input type="text" name="editmode" class="form-control" />
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        httperror
                                        <input type="text" name="httperror" class="form-control" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            <div class="tab-pane row" id="columns">

                <div class="col-md-12">

                    <script>
                        var data = data || {};

                        data.options = {
                            columns: []
                        };

                        data.model = {
                            readonly: false
                        };
                        var fns = fns || {};
                        var id = 0;
                        fns.refreshJson = function () {
                            $('#json textarea').text(
                                "gridponent('#grid1', " +
                                    todd.stringify(data.options)
                                + ');'
                            );
                            $('#html textarea').text(todd.ponentia(data.options));
                        };
                        fns.removeEmptyProps = function (dataItem) {
                            Object.getOwnPropertyNames(dataItem).forEach(function (prop) {
                                if (dataItem[prop] === '') {
                                    delete dataItem[prop];
                                }
                            });
                        };
                        fns.removeFalseProps = function (dataItem) {
                            Object.getOwnPropertyNames(dataItem).forEach(function (prop) {
                                if (dataItem[prop] === false) {
                                    delete dataItem[prop];
                                }
                            });
                        };
                        fns.create = function (model, callback) {
                            model.id = ++id;
                            fns.removeFalseProps(model);
                            fns.removeEmptyProps(model);
                            data.options.columns.push(model);
                            fns.refreshJson();
                            callback({
                                dataItem: model
                            });
                        };
                        fns.update = function (model, callback) {
                            fns.removeFalseProps(model);
                            fns.removeEmptyProps(model);
                            var dataItem = data.options.columns.find(function (col) { return col.id == model.id });
                            gridponent.shallowCopy(model, dataItem);
                            fns.refreshJson();
                            callback({
                                dataItem: model
                            });
                        };
                        fns.destroy = function (model, callback) {
                            var index = data.options.columns.findIndex(function (col) { return col.id == model.id });
                            data.options.columns.splice(index, 1);
                            fns.refreshJson();
                            callback({
                                dataItem: model
                            });
                        };

                        $('[name]:not([type=checkbox])').change(function () {
                            var val = $(this).val(),
                                name = this.name;

                            if (val == '') {
                                delete data.options[name];
                            }
                            else {
                                data.options[name] = val;
                            }
                            fns.refreshJson();
                        });

                        $('[name][type=checkbox]').change(function () {

                            var val = this.checked,
                                name = this.name;

                            if (val == false) {
                                delete data.options[name];
                            }
                            else {
                                data.options[name] = val;
                            }
                            fns.refreshJson();
                        });

                    </script>

                    <div class="panel panel-primary">
                        <div class="panel-heading">Columns</div>
                        <div class="panel-body">
                            <grid-ponent 
                                responsive="true"
                                read="data.options.columns"
                                create="fns.create"
                                update="fns.update"
                                destroy="fns.destroy"
                                model="data.model"
                                edit-mode="modal">
                                <gp-column field="field"></gp-column>
                                <gp-column field="sort"></gp-column>
                                <gp-column field="header"></gp-column>
                                <gp-column field="width"></gp-column>
                                <gp-column field="classes">
                                    <script type="text/html" data-template="body">
                                        <div>{{header-class}}</div>
                                        <div>{{body-class}}</div>
                                        <div>{{edit-class}}</div>
                                        <div>{{footer-class}}</div>
                                    </script>
                                    <script type="text/html" data-template="edit">
                                        <input type="text" name="header-class" value="{{header-class}}" class="form-control" placeholder="header">
                                        <input type="text" name="body-class" value="{{body-class}}" class="form-control" placeholder="body">
                                        <input type="text" name="edit-class" value="{{edit-class}}" class="form-control" placeholder="edit">
                                        <input type="text" name="footer-class" value="{{footer-class}}" class="form-control" placeholder="footer">
                                    </script>
                                </gp-column>
                                <gp-column field="templates">
                                    <script type="text/html" data-template="body">
                                        <div>{{header-template}}</div>
                                        <div>{{body-template}}</div>
                                        <div>{{edit-template}}</div>
                                        <div>{{footer-template}}</div>
                                    </script>
                                    <script type="text/html" data-template="edit">
                                        <input type="text" name="header-template" value="{{header-template}}" class="form-control" placeholder="header">
                                        <input type="text" name="body-template" value="{{body-template}}" class="form-control" placeholder="body">
                                        <input type="text" name="edit-template" value="{{edit-template}}" class="form-control" placeholder="edit">
                                        <input type="text" name="footer-template" value="{{footer-template}}" class="form-control" placeholder="footer">
                                    </script>
                                </gp-column>
                                <gp-column field="format"></gp-column>
                                <gp-column field="readonly"></gp-column>
                                <gp-column field="commands"></gp-column>
                                <gp-column commands="Edit,Delete"></gp-column>
                            </grid-ponent>
                        </div>
                    </div>

                </div>

            </div>


            <div class="tab-pane row" id="json">
                <div class="col-md-12">
                    <div class="panel panel-primary">
                        <div class="panel-heading">
                            <div class="row">
                                <div class="col-sm-6">JSON</div>
                            </div>
                        </div>
                        <div class="panel-body">
                            <textarea readonly style="width: 100%;height: 400px"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane row" id="html">
                <div class="col-md-12">
                    <div class="panel panel-primary">
                        <div class="panel-heading">
                            <div class="row">
                                <div class="col-sm-6">HTML</div>
                            </div>
                        </div>
                        <div class="panel-body">
                            <textarea readonly style="width: 100%;height: 400px"></textarea>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>

</div>
<style>
    input[type=checkbox] {
        margin: 0;
    }
    label {
        width: 100%;
    }
</style>

