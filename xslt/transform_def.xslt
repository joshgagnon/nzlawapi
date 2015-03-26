
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space"> ,.;:)(</xsl:variable>

    <xsl:template match="/">
        <xsl:apply-templates select="catalex-def-para"/>
    </xsl:template>

        <xsl:template match="catalex-def-para">
            <div class="definition-result">
                <div class="legislation">
                    <xsl:apply-templates select="text|def-para|para|catalex-src"/>
                </div>
        </div>
    </xsl:template>

    <xsl:template match="def-para|para">
                <div class="def-para">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                    <p class="text">
                         <xsl:apply-templates select="para/text|para/label-para|example|text|label-para|amend"/>
                    </p>
                </div>
    </xsl:template>



   <xsl:template match="catalex-def">
        <a class="def-popover" href="#" tabindex="0" data-toggle="popover"  data-html="true">
            <xsl:attribute name="def-id">
               <xsl:value-of select="@def-id"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

       <xsl:template match="example">
        <div class="example">
            <h6 class="heading"><strong>Example</strong></h6>
            <p  class="text"><xsl:apply-templates select="para"/></p>
        </div>
    </xsl:template>

    <xsl:template match="emphasis[@style='bold']">
        &#160;<span style="font-weight:bold"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="emphasis[@style='italic']">
        &#160;<span style="font-style:italic"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="*[@href]">
        <a>
            <xsl:attribute name="href">/open_article/<xsl:value-of select="@href"/>
            </xsl:attribute>
            <xsl:attribute name="data-href"><xsl:value-of select="@href"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

    <xsl:template match="catalex-src[@href]">
        <span class="catalex-src">
        Source: <a >
        <xsl:attribute name="href">/open_article/<xsl:value-of select="@href"/>
        </xsl:attribute>
            <xsl:value-of select="."/>
        </a>
        </span>
    </xsl:template>

   <xsl:template match="para/text|insertwords">
         <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
            <li>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>

    <xsl:template match="def-term">
         <dfn class="def-term">
            <xsl:attribute name="id">
                    <xsl:value-of select="def-term/@id"/>
                </xsl:attribute>
                <xsl:apply-templates/>
            </dfn>
    </xsl:template>

       <xsl:template match="label">
        <p class="labelled label">
            <xsl:if test="text() != ''">
                <span class="label">
                    (<xsl:value-of select="."/>)
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

       <xsl:template match="text">
            <div class="catalex-def-context">
             <xsl:apply-templates/>
            </div>
       </xsl:template>
</xsl:stylesheet>