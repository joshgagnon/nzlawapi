
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:import href="equations.xslt" />
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
                    <xsl:apply-templates select="front"/>
                    <xsl:apply-templates select="body"/>
                    <xsl:apply-templates select="schedule.group"/>
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
            <!-- <p class="reprint-date">
                Reprint as at <xsl:value-of select="reprint-date"/>
            </p> -->
            <h1 class="title"><xsl:value-of select="title"/></h1>
        </div>
    </xsl:template>

    <xsl:template match="contents">
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
                        <xsl:attribute name="data-location">s <xsl:value-of select="./prov/label"/> </xsl:attribute>
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
                        <xsl:attribute name="data-location">s <xsl:value-of select="./prov/label"/> </xsl:attribute>
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
                    <xsl:attribute name="data-location">s <xsl:value-of select="label"/> </xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:call-template name="current"/>
              <xsl:choose>
                <xsl:when test="heading != ''">
                    <h5 class="prov labelled">
                        <a>
                        <xsl:attribute name="href">/act_search_id/<xsl:value-of select="@id"/></xsl:attribute>
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
                            <span class="deleted label-deleted">[Repealed]</span>
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
                <xsl:if test="not(ancestor::*[@quote])">
                    <xsl:attribute name="data-location">(<xsl:value-of select="label"/>)</xsl:attribute>
                </xsl:if>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>

    <xsl:template match="table[not(ancestor::eqn)]">
        <table>
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
                <colgroup>
                    <xsl:apply-templates select="tgroup/colspec"/>
                </colgroup>
            <tbody>
                <xsl:apply-templates select="tgroup/tbody/row"/>
            </tbody>
        </table>
    </xsl:template>

    <xsl:template match="colspec">
        <col>
           <xsl:attribute name="style">
               width:<xsl:value-of select="@colwidth"/>
            </xsl:attribute>
        </col>
    </xsl:template>

    <xsl:template match="row">
        <tr class="row">
            <xsl:apply-templates select="entry"/>
        </tr>
    </xsl:template>

    <xsl:template match="entry">
        <td>
              <xsl:if test="count(following-sibling::entry) = 0">
              <xsl:attribute name="colspan">
                    <xsl:value-of select="4-count(preceding-sibling::entry)"/>
                </xsl:attribute>
            </xsl:if>
           <xsl:attribute name="style">
               text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            <xsl:apply-templates />
        </td>
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
        &#160;<span style="font-weight:bold"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="emphasis[@style='italic']">
        &#160;<span style="font-style:italic"><xsl:value-of select="."/></span>
    </xsl:template>


   <xsl:template match="catalex-def">
        <a class="def-popover" href="#" tabindex="0" data-toggle="popover"  data-html="true">
            <xsl:attribute name="def-id">
               <xsl:value-of select="@def-id"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

    <xsl:template match="*[@href]">
        <a data-link-id="{generate-id()}">
            <xsl:attribute name="href">/act_search_id/<xsl:value-of select="@href"/>
            </xsl:attribute>
            <xsl:if test="name() = 'intref'">
                 <xsl:attribute name="class">internal_ref</xsl:attribute>
                 <xsl:attribute name="data-target-id"><xsl:value-of select="@href"/></xsl:attribute>
            </xsl:if>
            <xsl:if test="name() = 'extref'">
                 <xsl:attribute name="class">external_ref</xsl:attribute>
            </xsl:if>
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

    <xsl:template match="schedule.group">
      <div class="schedule-group">
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
        <xsl:apply-templates select="schedule"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.provisions">
      <div class="schedule-provisions">
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
        <xsl:apply-templates select="prov|part"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.misc">
      <div class="schedule-misc">
        <xsl:apply-templates select="head1|para/label-para|prov|para"/>
      </div>
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

    <xsl:template match="schedule">
        <div class="schedule">
                <xsl:if test="@data-hook!=''">
                    <xsl:attribute name="data-hook">
                        <xsl:value-of select="@data-hook"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-hook-length">
                        <xsl:value-of select="@data-hook-length"/>
                    </xsl:attribute>
                </xsl:if>
            <xsl:call-template name="current"/>
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:attribute name="data-location">sch <xsl:value-of select="label"/></xsl:attribute>
            <table class="empowering-prov-layout" summary="This table lays out an empowering provision with it's subject. ">
                <tbody><tr>
                    <td class="header">
                        <h2 lang="en-NZ" class="schedule">
                            <span class="label">
                                <span class="hit">Schedule</span>&#160;<xsl:value-of select="label"/>
                            </span><br/>
                            <xsl:value-of select="heading"/>
                        </h2>
                    </td>
                    <td class="empowering-prov">
                    </td>
                    </tr>
                </tbody>
            </table>
            <xsl:apply-templates select="schedule.provisions|schedule.misc|notes"/>
        </div>
    </xsl:template>

</xsl:stylesheet>