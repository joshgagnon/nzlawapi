
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"  xmlns:atidlm="http://www.arbortext.com/namespace/atidlm">


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


    <xsl:template match="cover">
        <div class="cover reprint">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
           <xsl:if test=" ../@formatted.reprint != '' and ../@old-version != '' ">
                <p class="reprint-date">
                    Reprint<br/>as at <xsl:value-of select="../@formatted.reprint" />
                </p>
            </xsl:if>
            <h1 class="title"><xsl:value-of select="title"/></h1>
            <xsl:if test="../@sr.no">
                <p class="reprint-sr-number">(SR <xsl:value-of select="../@year" />/<xsl:value-of select="../@sr.no" />)</p>
                <p class="gg"><xsl:value-of select="gg" /></p>
                <xsl:apply-templates select="made" />
            </xsl:if>
            <xsl:if test="../@act.no">

            </xsl:if>
            <xsl:apply-templates select="notes"/>
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
                <xsl:apply-templates select="long-title/para/text"/>

                <xsl:apply-templates select="long-title/para/label-para"/>
                <xsl:if test="long-title[@deletion-status='repealed']">
                    <p class="deleted para-deleted">[Repealed]</p>
                </xsl:if>
                <xsl:apply-templates select="long-title/notes/history/history-note"/>
             </div>
        </div>
    </xsl:template>

    <xsl:template match="body[@prov-type='regulation']/heading">
        <h2 class="regulation-type"><xsl:value-of select="."/></h2>
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
             <xsl:apply-templates />
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
            <xsl:call-template name="current">
                <xsl:with-param name="class">part</xsl:with-param>
            </xsl:call-template>
                <xsl:attribute name="data-location-no-path"></xsl:attribute>
                <xsl:choose>
                     <xsl:when test="ancestor::*[@quote]  or ancestor::amend">
                     </xsl:when>
                    <xsl:when test="ancestor::schedule">
                        <xsl:attribute name="data-location">, cl <xsl:value-of select="normalize-space(./prov/label)"/></xsl:attribute>
                    </xsl:when>
                        <xsl:otherwise>
                        <xsl:attribute name="data-location">s <xsl:value-of select="normalize-space(./prov/label)"/></xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
                <xsl:if test="not(ancestor::amend) and label!='' ">
                <xsl:attribute name="data-location-breadcrumb">part <xsl:value-of select="label"/><xsl:text> </xsl:text></xsl:attribute>
                </xsl:if>

            <h2 class="part">
                <xsl:if test="not(ancestor::amend) and label!='' ">
                    <span class="label">Part <xsl:value-of select="label"/></span><br/>
                </xsl:if>
                <xsl:value-of select="heading"/>
            </h2>
            <xsl:apply-templates select="subpart|crosshead|prov|amend/prov|para"/>
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
            <xsl:call-template name="current">
                <xsl:with-param name="class">subpart</xsl:with-param>
            </xsl:call-template>
                <xsl:attribute name="data-location-no-path"></xsl:attribute>
                <xsl:choose>
                     <xsl:when test="ancestor::*[@quote]  or ancestor::amend">
                     </xsl:when>
                    <xsl:when test="ancestor::schedule">
                        <xsl:attribute name="data-location">, cl <xsl:value-of select="normalize-space(./prov/label)"/></xsl:attribute>
                    </xsl:when>
                        <xsl:otherwise>
                        <xsl:attribute name="data-location">s <xsl:value-of select="normalize-space(./prov/label)"/></xsl:attribute>
                    </xsl:otherwise>
                </xsl:choose>
                 <xsl:if test="not(ancestor::amend)">
                <xsl:attribute name="data-location-breadcrumb">Subpart <xsl:value-of select="label"/><xsl:text> </xsl:text></xsl:attribute>
                </xsl:if>
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
                     <xsl:when test="ancestor::*[@quote] or ancestor::amend">
                     </xsl:when>
                <xsl:when test="ancestor::schedule">
                    <xsl:attribute name="data-location">, cl <xsl:value-of select="normalize-space(label)"/></xsl:attribute>
                </xsl:when>
                    <xsl:otherwise>
                    <xsl:attribute name="data-location">s <xsl:value-of select="normalize-space(label)"/></xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:call-template name="current">
                <xsl:with-param name="class">prov</xsl:with-param>
            </xsl:call-template>
            <xsl:if test="heading !=''">
                    <h5 class="prov labelled">
                        <a class="focus-link">
                        <xsl:attribute name="href">/open_article/instrument/<xsl:value-of select="@id"/></xsl:attribute>
                        <span class="label">
                            <xsl:call-template name="parentquote"/>
                            <xsl:value-of select="label"/>
                        </span>
                        <xsl:value-of select="heading"/>
                        </a>
                    </h5>
            </xsl:if>

            <ul class="prov">
                <li>
                    <xsl:choose>
                        <xsl:when test="prov.body != ''">
                             <xsl:apply-templates select="prov.body/subprov|prov.body/para/list"/>
                             <xsl:if test="prov.body/para/text != ''">
                                 <p class="headless label">
                                        <span class="label">
                                                <xsl:call-template name="parentquote"/>
                                                 <a class="focus-link">
                                                <xsl:value-of select="label"/>
                                                </a>
                                        </span>
                                         <xsl:value-of select="prov.body/para/text"/>
                                </p>
                                    <xsl:apply-templates select="prov.body/para/label-para"/>
                                    <xsl:apply-templates select="prov.body/notes/history/history-note"/>
                             </xsl:if>
                        </xsl:when>
                        <xsl:otherwise>
                            <!-- error in Lawyers and Conveyancers Act (Lawyers: Conduct and Client Care) Rules 2008 chapter 15 -->
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
                    <xsl:apply-templates select="def-para|prov.body/para/def-para|notes/history/history-note" />
                </li>
            </ul>
        </div>
    </xsl:template>


    <xsl:template match='subprov'>
        <div class="subprov">
            <xsl:call-template name="current">
                <xsl:with-param name="class">subprov</xsl:with-param>
            </xsl:call-template>
            <xsl:if test="label != '' and not(ancestor::*[@quote]) and not(ancestor::amend)">
                <xsl:attribute name="data-location">
                    <xsl:call-template name="bracketlocation">
                        <xsl:with-param name="label"><xsl:value-of select="normalize-space(label)"/></xsl:with-param>
                    </xsl:call-template>
                 </xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="label"/>
              <xsl:apply-templates select="para/*[position() > 1]|para[position() > 1]/*|para/amend/prov|label-para" />
        </div>
    </xsl:template>

    <xsl:template match='prov.body/para/list'>
        <ul class="list">
            <xsl:call-template name="current">
                <xsl:with-param name="class">list</xsl:with-param>
            </xsl:call-template>
            <xsl:apply-templates select="item" />
        </ul>
    </xsl:template>

    <xsl:template match="label-para">
        <ul class="label-para">
            <xsl:call-template name="current"/>
            <li>
            <xsl:call-template name="current">
                <xsl:with-param name="class">label-para</xsl:with-param>
            </xsl:call-template>
                <xsl:if test="label != '' and not(ancestor::*[@quote]) and not(ancestor::amend)">
                    <xsl:attribute name="data-location">
                    <xsl:call-template name="bracketlocation">
                        <xsl:with-param name="label"><xsl:value-of select="normalize-space(label)"/></xsl:with-param>
                    </xsl:call-template>
                </xsl:attribute>

                </xsl:if>
                <!-- label will render first para/text, so must match others separately -->
                <xsl:apply-templates select="label|para/label-para|para/text[position()>1]"/>
            </li>
        </ul>
    </xsl:template>


    <xsl:template match="def-para">
        <div class="def-para">
            <xsl:call-template name="current">
                <xsl:with-param name="class">def-para</xsl:with-param>
            </xsl:call-template>
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <p class="text">
                <xsl:call-template name="quote"/>
                <xsl:apply-templates select="para/text|para/label-para|example|text" />
            </p>
            <xsl:if test="@deletion-status='repealed'">
                <p class="deleted para-deleted">[Repealed]</p>
            </xsl:if>
        </div>
    </xsl:template>

    <!-- can't be right -->
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
            <xsl:if test="ancestor::def-para/para/text  and not(ancestor::amend)" >
                <xsl:attribute name="data-location">define: <xsl:value-of select="."/>
                </xsl:attribute>
                <xsl:attribute name="data-location-no-path">true</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </dfn>
    </xsl:template>

    <xsl:template match="label">
        <p class="labelled label">
            <xsl:call-template name="current">
                <xsl:with-param name="class">labelled label</xsl:with-param>
            </xsl:call-template>

            <xsl:if test="text() != ''">
                <span class="label focus-link">
                     <xsl:call-template name="parentquote"/>
                     <xsl:call-template name="openbracket"/>
                     <xsl:value-of select="."/>
                     <xsl:call-template name="closebracket"/>
                </span>
            </xsl:if>
            <xsl:choose>
                <xsl:when test="../para[1]/text[1] != ''">
                    <xsl:apply-templates select="../para[1]/text[1]"/>
                </xsl:when>
                <xsl:otherwise>
                    <span class="deleted label-deleted">[Repealed]</span>
                </xsl:otherwise>
            </xsl:choose>
        </p>
    </xsl:template>

    <xsl:template match="item/label">
        <p class="labelled item">
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
        <xsl:variable name="length" select="string-length(preceding::text()[1])"/>
          <xsl:if test="string-length(preceding::text()[1])">
                <xsl:if test="string-length(translate(substring(preceding::text()[1], $length), $symbols-skip-insert-space, '')) != 0 ">&#160;</xsl:if>
        </xsl:if>
        <span style="font-weight:bold"><xsl:apply-templates/></span>
    </xsl:template>

    <xsl:template match="emphasis[@style='italic']">
        <xsl:variable name="length" select="string-length(preceding::text()[1])"/>
          <xsl:if test="string-length(preceding::text()[1])">
                <xsl:if test="string-length(translate(substring(preceding::text()[1], $length), $symbols-skip-insert-space, '')) != 0 ">&#160;</xsl:if>
        </xsl:if>
       <span style="font-style:italic"><xsl:apply-templates/></span>
    </xsl:template>


   <xsl:template match="catalex-def">
        <a class="def-popover" href="#" tabindex="0" data-toggle="popover"  data-html="true">
            <xsl:attribute name="data-def-id">
               <xsl:value-of select="@def-ids"/>
            </xsl:attribute>
            <xsl:attribute name="data-def-ex-id">
               <xsl:value-of select="@def-ex-ids"/>
            </xsl:attribute>
             <xsl:attribute name="data-def-idx">
               <xsl:value-of select="@def-idx"/>
            </xsl:attribute>
             <xsl:attribute name="href">/open_definition/<xsl:value-of select="@def-ids"/>/<xsl:value-of select="@def-ex-ids"/></xsl:attribute>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

    <xsl:template match="*[@href]">
        <a>
            <xsl:attribute name="data-link-id"><xsl:value-of select="@link-id"/></xsl:attribute>
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
                 <xsl:if test="@location != ''">
                    <xsl:attribute name="data-location"><xsl:value-of select="@location"/></xsl:attribute>
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

    <xsl:template match="atidlm:link">
        <a>
            <xsl:attribute name="data-link-id"><xsl:value-of select="@atidlm:xmlId"/></xsl:attribute>
            <xsl:attribute name="data-href"><xsl:value-of select="atidlm:resourcepair/@atidlm:targetXmlId"/>
            </xsl:attribute>
              <xsl:attribute name="href">/open_article/instrument/<xsl:value-of select="atidlm:resourcepair/@atidlm:targetXmlId"/>
            </xsl:attribute>
            <xsl:value-of select="atidlm:linkcontent"/>
        </a>
    </xsl:template>

    <xsl:template match="link">
        <a>
            <xsl:attribute name="data-link-id"><xsl:value-of select="@xmlId"/></xsl:attribute>
            <xsl:attribute name="data-href"><xsl:value-of select="resourcepair/@targetXmlId"/>
            </xsl:attribute>
              <xsl:attribute name="href">/open_article/instrument/<xsl:value-of select="resourcepair/@targetXmlId"/>
            </xsl:attribute>
            <xsl:value-of select="linkcontent"/>
        </a>
    </xsl:template>

   <!-- <xsl:template match="*[@current = 'true']">

        <xsl:attribute name="class">current
        </xsl:attribute>
          <xsl:apply-templates/>
    </xsl:template> -->

   <xsl:template match="para/text|insertwords">
         <xsl:apply-templates />
    </xsl:template>



   <xsl:template match="citation">
         <xsl:apply-templates />
    </xsl:template>

   <xsl:template match="example">
        <div class="example">
            <h6 class="heading"><strong>Example</strong></h6>
            <p  class="text"><xsl:apply-templates select="para"/></p>
        </div>
    </xsl:template>

    <xsl:template match="text()">
        <xsl:value-of select="."/>
    </xsl:template>


    <xsl:template match="para[1]">
        <p class="text"><xsl:apply-templates /></p>
    </xsl:template>

    <xsl:template match="para[position() > 1]/text">
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

    <xsl:template match="conv">
      <div class="conv">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
        <xsl:apply-templates select="conv.body"/>
      </div>
    </xsl:template>

    <xsl:template match="conv.body">
      <div class="conv-body">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
        <xsl:apply-templates />
      </div>
    </xsl:template>

    <xsl:template match="head1">
      <div class="head1">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
        <xsl:if test="label != '' and starts-with(label, 'Part ')">
            <xsl:variable name="part">
              <xsl:call-template name="string-replace-all">
                <xsl:with-param name="text" select="label" />
                <xsl:with-param name="replace" select="'Part '" />
                <xsl:with-param name="by" select="''" />
              </xsl:call-template>
          </xsl:variable>
               <xsl:attribute name="data-location">, part <xsl:value-of select="normalize-space($part)"/></xsl:attribute>
        </xsl:if>
            <h2 class="head1">
                 <xsl:if test="label != ''">
                <span class="label">
                    <xsl:value-of select="label"/>
                </span><br/>
                </xsl:if>
                <xsl:value-of select="heading"/>
            </h2>
        <xsl:apply-templates select="prov|para|head2|head3|head4|head5|notes"/>
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
        <xsl:apply-templates select="prov|para|head3|head4|head5"/>
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
                <xsl:apply-templates select="prov|para|head4|head5"/>
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
                <xsl:apply-templates select="prov|para|head5"/>
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
          <xsl:apply-templates select="prov|para"/>
      </div>
    </xsl:template>

    <xsl:template match="brk">
        <br class="brk"/>
    </xsl:template>

    <xsl:template match="list">
            <ul class="list">
             <xsl:apply-templates select="item"/>
        </ul>
    </xsl:template>

    <xsl:template match="list/item">
        <li class="bull">
            <p class="item">
                <xsl:value-of select="label"/>

                <xsl:apply-templates select="para/text|para/list"/>
            </p>
        </li>
    </xsl:template>

</xsl:stylesheet>