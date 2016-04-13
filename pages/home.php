<?php include "../partials/nocache.php"; ?>

<div jx-panel="content-body">

    <h3>
        <code>
            &lt;/home&gt;
        </code>
    </h3>

    <div class="panel-background">

        <p>This is a grid that uses the <a href="http://webcomponents.org/" target="_blank">web components</a> API.
            I built it because I needed a configurable grid that is compatible with IE9. 
            It uses the web components API if present, and falls back to querying the DOM on page load if not.
            What about AJAX in browsers without web component support? I'm using an AJAX library called lojax which provides an event that is triggered when  
            content is loaded into the page dynamically. I simply handle this event and query the new content for grid-ponent elements.
        </p>

        <p>It has these features:</p>

        <ul>
            <li>Client side sorting, paging, and searching</li>
            <li>Server side sorting, paging and searching</li>
            <li>In-place editing</li>
            <li>Templating for the toolbar, header cells, body cells, edit cells, and footer cells.</li>
            <li>Formatting for dates and times via <a href="http://momentjs.com/" target="_blank">moment.js</a></li>
            <li>Formatting for numbers via <a href="http://numeraljs.com/" target="_blank">numeral.js</a></li>
            <li>Fixed headers</li>
            <li>Fixed footers</li>
            <li>Responsive</li>
            <li>Configurable search and pager positions</li>
            <li>Row selection</li>
            <li>An extensible JavaScript API</li>
            <li><a href="http://getbootstrap.com/" target="_blank">Bootstrap</a>-ready</li>
        </ul>

        <p>grid-ponent has no dependencies.</p>

        <h4><a href="#pages/grid.php">Click here</a> to see what it can do.</h4>

    </div>
</div>

