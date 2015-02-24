
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:import href="equations.xslt" />
    <xsl:import href="tables.xslt" />
    <xsl:import href="end.xslt" />
    <xsl:import href="schedules.xslt" />
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space"> ,.;:)(</xsl:variable>

    <xsl:template match="/">

        <xsl:apply-templates />

    </xsl:template>

    <xsl:template name="current">
        <xsl:if test="@current = 'true'">
           <xsl:attribute name="class">current</xsl:attribute>
        </xsl:if>
    </xsl:template>

    <xsl:template name="quote">
        <xsl:if test="@quote = '1'"><xsl:attribute name="quote"></xsl:attribute>“</xsl:if>
    </xsl:template>

    <xsl:template name="parentquote">
        <xsl:if test="../@quote = '1'"><xsl:attribute name="quote"></xsl:attribute>“</xsl:if>
    </xsl:template>

    <xsl:template match="act">

        <div class="legislation">
            <div>
                <div class="act top-level">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                    <xsl:if test="@terminated = 'repealed'">
                       <xsl:attribute name="class">repealed</xsl:attribute>
                    </xsl:if>
                    <xsl:call-template name="current"/>
                    <xsl:apply-templates select="cover"/>
                    <xsl:apply-templates select="billdetail"/>
                    <xsl:apply-templates select="front"/>
                    <xsl:apply-templates select="body"/>
                    <xsl:apply-templates select="schedule.group"/>
                    <xsl:apply-templates select="end"/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="regulation">
        <div class="legislation">
            <div>
            <div class="regulation top-level">
                    <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                     <xsl:if test="@terminated = 'repealed'">
                       <xsl:attribute name="class">repealed</xsl:attribute>
                    </xsl:if>
                        <xsl:call-template name="current"/>
                      <xsl:apply-templates select="cover"/>
                       <xsl:apply-templates select="front"/>
                     <xsl:apply-templates select="body"/>
                     <xsl:apply-templates select="schedule.group"/>
                     <xsl:apply-templates select="end"/>
                </div>

            </div>
        </div>
    </xsl:template>

    <xsl:template match="sop">
        <div class="legislation">
            <div>
            <div class="sop top-level">
                    <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                </div>
        <xsl:apply-templates />
            </div>
        </div>
    </xsl:template>

    <xsl:template match="cover|billdetail">
        <div class="cover reprint">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
            <!--<xsl:if test=" ../@formatted.reprint != ''">
                <p class="reprint-date">
                    Reprint<br/>as at <xsl:value-of select="../@formatted.reprint" />
                </p>
            </xsl:if> -->
            <h1 class="title"><xsl:value-of select="title"/></h1>
            <xsl:if test="../@sr.no">
                <p class="reprint-sr-number">(SR <xsl:value-of select="../@year" />/<xsl:value-of select="../@sr.no" />)</p>
                <p class="gg"><xsl:value-of select="gg" /></p>
                <xsl:apply-templates select="made" />
            </xsl:if>
            <xsl:if test="../@act.no">

            </xsl:if>
            <!--<xsl:apply-templates select="cover.reprint-note"/> -->
        </div>
    </xsl:template>

    <xsl:template match="contents">
    </xsl:template>

    <xsl:template match="made">
        <div class="made">
            <h2 class="made"><xsl:value-of select="heading"/></h2>
            <p class="made-at"><xsl:value-of select="made.at"/></p>
            <p class="made-present"><xsl:value-of select="made.present"/></p>
        </div>

        </xsl:template>

    <xsl:template match="cover.reprint-note">
        <div class="cover-reprint-note">
            <hr class="cover-reprint-note"/>
                <h6 class="cover-reprint-note">Note</h6>
                 <xsl:apply-templates select="para|admin-office"/>
                <hr class="cover-reprint-note"/>
        </div>
    </xsl:template>

    <xsl:template match="admin-office">
        <p class="admin-office"><xsl:value-of select="."/></p>
    </xsl:template>


    <xsl:template match="front">
        <div class="front">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <div class="long-title">
                 <xsl:value-of select="long-title/para/text"/>

                <xsl:apply-templates select="long-title/para/label-para"/>
             </div>
        </div>
    </xsl:template>

    <xsl:template match="body">
        <div class="body">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
             <xsl:apply-templates select="part|prov|amend/prov"/>
        </div>
    </xsl:template>

    <xsl:template match="part">
        <div class="part">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
            <xsl:call-template name="current"/>
                <xsl:attribute name="data-location-no-path"></xsl:attribute>
                <xsl:choose>
                     <xsl:when test="ancestor::*[@quote]">
                     </xsl:when>
                    <xsl:when test="ancestor::schedule">
                        <xsl:attribute name="data-location">, cl <xsl:value-of select="./prov/label"/></xsl:attribute>
                    </xsl:when>
                        <xsl:otherwise>
                        <xsl:attribute name="data-location">s <xsl:value-of select="./prov/label"/></xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            <h2 class="part">
                <span class="label">Part <xsl:value-of select="label"/></span><br/>
                <xsl:value-of select="heading"/>
            </h2>
            <xsl:apply-templates select="subpart|crosshead|prov|amend/prov"/>
        </div>
    </xsl:template>

    <xsl:template match="subpart">
        <div class="subpart">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
            <xsl:call-template name="current"/>
                <xsl:attribute name="data-location-no-path"></xsl:attribute>
                <xsl:choose>
                    <xsl:when test="ancestor::schedule">
                        <xsl:attribute name="data-location">, cl <xsl:value-of select="./prov/label"/></xsl:attribute>
                    </xsl:when>
                        <xsl:otherwise>
                        <xsl:attribute name="data-location">s <xsl:value-of select="./prov/label"/></xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
            <h3 class="subpart">
                <span class="label">Subpart <xsl:value-of select="label"/></span><span class="suffix">—</span>
                <xsl:value-of select="heading"/>
            </h3>
            <xsl:apply-templates select="crosshead|prov|amend/prov"/>
        </div>
    </xsl:template>

    <xsl:template match="prov">
        <div class="prov">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
            <xsl:choose>
                     <xsl:when test="ancestor::*[@quote]">
                     </xsl:when>
                <xsl:when test="ancestor::schedule">
                    <xsl:attribute name="data-location">, cl <xsl:value-of select="label"/></xsl:attribute>
                </xsl:when>
                    <xsl:otherwise>
                    <xsl:attribute name="data-location">s <xsl:value-of select="label"/></xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:call-template name="current"/>
              <xsl:choose>
                <xsl:when test="heading != ''">
                    <h5 class="prov labelled">
                        <a>
                        <xsl:attribute name="href">/open_article/instruments/<xsl:value-of select="@id"/></xsl:attribute>
                        <span class="label">
                            <xsl:call-template name="parentquote"/>
                            <xsl:value-of select="label"/>
                        </span>
                        <xsl:value-of select="heading"/>
                        </a>
                    </h5>
                </xsl:when>
            </xsl:choose>
            <ul class="prov">
                <li>
                    <xsl:choose>
                        <xsl:when test="prov.body != ''">
                             <xsl:apply-templates select="prov.body/subprov"/>
                             <xsl:if test="prov.body/para/text != ''">
                                 <p class="headless label">
                                        <span class="label">
                                                <xsl:call-template name="parentquote"/>
                                                <xsl:value-of select="label"/>
                                        </span>
                                         <xsl:value-of select="prov.body/para/text"/>
                                </p>
                                    <xsl:apply-templates select="prov.body/para/label-para"/>
                                    <xsl:apply-templates select="prov.body/notes/history/history-note"/>
                             </xsl:if>
                        </xsl:when>
                        <xsl:otherwise>
                            <span class="deleted label-deleted">
                                <xsl:choose>
                                <xsl:when test="ancestor::act">
                                        [Repealed]
                                    </xsl:when>
                                    <xsl:otherwise>
                                        [Revoked]
                                </xsl:otherwise>
                                </xsl:choose>
                            </span>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:apply-templates select="notes/history/history-note"/>
                </li>
            </ul>
        </div>
    </xsl:template>


    <xsl:template match='prov.body/subprov'>
        <div class="subprov">
            <xsl:call-template name="current"/>
            <xsl:if test="label != '' and not(ancestor::*[@quote])">
                <xsl:attribute name="data-location">(<xsl:value-of select="label"/>)</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="label"/>
            <xsl:apply-templates select="para/*[position() > 1]|para/amend/prov" />
        </div>
    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
            <xsl:call-template name="current"/>
            <li>
                <xsl:if test="label != '' and not(ancestor::*[@quote])">
                    <xsl:attribute name="data-location">(<xsl:value-of select="label"/>)</xsl:attribute>
                </xsl:if>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>


    <xsl:template match="def-para">
        <div class="def-para">
            <xsl:call-template name="current"/>
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <p class="text">
                <xsl:call-template name="quote"/>
                <xsl:apply-templates select="para/text|para/label-para|example|text"/>
            </p>
        </div>
    </xsl:template>

    <xsl:template match="amend">
        <div class="def-para">
             <xsl:attribute name="class">
                flush-left-margin-<xsl:value-of select="amend"/>
            </xsl:attribute>
            <blockquote class="text">
                  <xsl:attribute name="class">
                    amend amend-increment-<xsl:value-of select="increment"/>
                </xsl:attribute>
                 <xsl:apply-templates select="def-para"/>
            </blockquote>
        </div>
    </xsl:template>

    <xsl:template match="def-term">
        <dfn class="def-term">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:if test="ancestor::def-para/para/text">
                <xsl:attribute name="data-location">define: <xsl:value-of select="."/>
                </xsl:attribute>
                <xsl:attribute name="data-location-no-path">true</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </dfn>
    </xsl:template>

    <xsl:template match="label">
        <p class="labelled label">
            <xsl:call-template name="current"/>
            <xsl:if test="text() != ''">
                <span class="label">
                     <xsl:call-template name="parentquote"/>(<xsl:value-of select="."/>)
                </span>
            </xsl:if>
            <xsl:choose>
                <xsl:when test="../para/text != ''">
                    <xsl:apply-templates select="../para/text[1]"/>
                </xsl:when>
                 <!-- <xsl:when test="../para/text != ''">
                    <xsl:apply-templates select="../para/text[1]"/>
                </xsl:when> -->
                <xsl:otherwise>
                    <span class="deleted label-deleted">[Repealed]</span>
                </xsl:otherwise>
            </xsl:choose>
        </p>
    </xsl:template>

    <xsl:template match="follow-text[@space-before='no']">
    </xsl:template>

    <xsl:template match='crosshead'>
        <h4 class="crosshead">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </h4>
    </xsl:template>

    <xsl:template match="notes/history/history-note">
        <p class="history-note">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </p>
    </xsl:template>


    <xsl:template match="admended-provision|amending-operation">
        <xsl:value-of select="."/>
    </xsl:template>


    <xsl:template match="emphasis[@style='bold']">
        <xsl:variable name="length" select="string-length(preceding-sibling::*[1])"/>
          <xsl:if test="string-length(preceding-sibling::*[1]/.)">
                <xsl:if test="string-length(translate(substring(., 1, 1), $symbols-skip-insert-space, '')) != 0 ">&#160;</xsl:if>
        </xsl:if>
        <span style="font-weight:bold"><xsl:apply-templates/></span>
    </xsl:template>

    <xsl:template match="emphasis[@style='italic']">
        &#160;<span style="font-style:italic"><xsl:apply-templates/></span>
    </xsl:template>


   <xsl:template match="catalex-def">
        <a class="def-popover" href="#" tabindex="0" data-toggle="popover"  data-html="true">
            <xsl:attribute name="data-def-id">
               <xsl:value-of select="@def-id"/>
            </xsl:attribute>
             <xsl:attribute name="data-def-idx">
               <xsl:value-of select="@def-idx"/>
            </xsl:attribute>

            <xsl:value-of select="."/>
        </a>
    </xsl:template>

    <xsl:template match="*[@href]">
        <a data-link-id="id-{count(preceding::*[@href])}">

            <xsl:attribute name="data-href"><xsl:value-of select="@href"/>
            </xsl:attribute>
            <xsl:choose>
            <xsl:when test="local-name() = 'intref'">
                  <xsl:attribute name="href">/open_article/instrument/<xsl:value-of select="@href"/>
                </xsl:attribute>
                 <xsl:attribute name="class">internal_ref</xsl:attribute>
                 <xsl:attribute name="data-target-id"><xsl:value-of select="@href"/></xsl:attribute>
            </xsl:when>
            <xsl:when test="local-name() = 'extref'">
                  <xsl:attribute name="href">/open_article/instrument/<xsl:value-of select="@href"/>
                </xsl:attribute>
                 <xsl:attribute name="class">external_ref</xsl:attribute>
            </xsl:when>
            <xsl:otherwise>
                  <xsl:attribute name="href">/open_article/<xsl:value-of select="@href"/></xsl:attribute>
                 <xsl:attribute name="data-target-id"><xsl:value-of select="@target-id"/></xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

   <!-- <xsl:template match="*[@current = 'true']">

        <xsl:attribute name="class">current
        </xsl:attribute>
          <xsl:apply-templates/>
    </xsl:template> -->

   <xsl:template match="para/text|insertwords">
         <xsl:apply-templates/>
    </xsl:template>

   <xsl:template match="citation">
         <xsl:apply-templates/>
    </xsl:template>

   <xsl:template match="example">
        <div class="example">
            <h6 class="heading"><strong>Example</strong></h6>
            <p  class="text"><xsl:apply-templates select="para"/></p>
        </div>
    </xsl:template>

    <xsl:template match="text()">
        <xsl:variable name="length" select="string-length(preceding-sibling::*[1])"/>
          <xsl:if test="string-length(preceding-sibling::*[1]/.)">
                <xsl:if test="string-length(translate(substring(., 1, 1), $symbols-skip-insert-space, '')) != 0 ">&#160;</xsl:if>
        </xsl:if>
        <xsl:value-of select="."/>
    </xsl:template>


    <xsl:template match="para">
        <p class="text"><xsl:apply-templates /></p>
    </xsl:template>

    <xsl:template match="form">
      <div class="form">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h4 class="form"><span class="label">Form <xsl:value-of select="label"/></span><br/>
            <xsl:value-of select="heading"/></h4>
             <xsl:apply-templates select="authorisation|form.body"/>
      </div>
    </xsl:template>


     <xsl:template match="form.body">
        <xsl:apply-templates />
     </xsl:template>
    <xsl:template match="authorisation">
      <p class="authorisation">
        <xsl:apply-templates />
      </p>
    </xsl:template>


    <xsl:template match="authorisation">
      <p class="authorisation">
        <xsl:apply-templates />
      </p>
    </xsl:template>

    <xsl:template match="head1">
      <div class="head1">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h2 class="head1">
                <span class="label"><xsl:value-of select="label"/></span><br/>
                <xsl:value-of select="heading"/>
            </h2>
        <xsl:apply-templates select="prov|para"/>
      </div>
    </xsl:template>

    <xsl:template match="head4">
      <div class="head4">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h4 class="head4">
                <xsl:value-of select="heading"/>
            </h4>
      </div>
    </xsl:template>
    <xsl:template match="head5">
      <div class="head4">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h5 class="head5">
                <xsl:value-of select="heading"/>
            </h5>
      </div>
    </xsl:template>
    <xsl:template match="head3">
      <div class="head4">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h3 class="head3">
                <xsl:value-of select="heading"/>
            </h3>
      </div>
    </xsl:template>

    <xsl:template match="head2">
      <div class="head4">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h2 class="head2">
                <xsl:value-of select="heading"/>
            </h2>
      </div>
    </xsl:template>




    <xsl:template match="brk">
        <br class="brk"/>
    </xsl:template>

</xsl:stylesheet>